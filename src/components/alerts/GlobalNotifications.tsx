import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  X,
  Bell,
  Clock,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Radio,
  Target,
  BarChart2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlertsContext } from "@/contexts/AlertsContext";
import type { AlertItem, AlertType } from "@/types/alerts";

export function GlobalNotifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const { alerts, dismissAlert, markRead, isQuietHours } = useAlertsContext();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => !a.read && !dismissedIds.has(a.id)).slice(0, 3);

  const applyRouteParams = useCallback((route: string, params?: Record<string, string>) => {
    if (!params) return route;
    let out = route;
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(`:${k}`, encodeURIComponent(v));
    }
    return out;
  }, []);

  const buildNavigateTarget = useCallback(
    (alert: AlertItem) => {
      if (!alert.routeTo) return null;
      let target = applyRouteParams(alert.routeTo, alert.routeParams);

      if (alert.eventId && target.startsWith("/calendar")) {
        const joiner = target.includes("?") ? "&" : "?";
        target = `${target}${joiner}eventId=${encodeURIComponent(alert.eventId)}`;
      }

      return target;
    },
    [applyRouteParams],
  );

  const navigateWithModalSupport = useCallback(
    (target: string) => {
      // ✅ If it's an asset route, navigate with backgroundLocation so App.tsx renders it as a modal overlay
      if (target.startsWith("/asset/")) {
        navigate(target, { state: { backgroundLocation: location } });
        return;
      }

      navigate(target);
    },
    [navigate, location],
  );

  const handleAlertClick = useCallback(
    (alert: AlertItem) => {
      markRead(alert.id);
      setDismissedIds((prev) => new Set([...prev, alert.id]));

      const target = buildNavigateTarget(alert);
      if (target) {
        navigateWithModalSupport(target);
        return;
      }

      switch (alert.type) {
        case "bias":
        case "price":
        case "level":
          if (alert.relatedAsset) navigateWithModalSupport(`/asset/${alert.relatedAsset}`);
          else navigateWithModalSupport("/markets");
          return;

        case "news":
        case "summary":
        case "breaking":
          if (alert.eventId) navigateWithModalSupport(`/calendar?eventId=${encodeURIComponent(alert.eventId)}`);
          else navigateWithModalSupport("/calendar");
          return;

        case "risk":
        case "exposure":
          navigateWithModalSupport("/risk-tools");
          return;

        case "session":
          navigateWithModalSupport("/alerts");
          return;

        default:
          navigateWithModalSupport("/alerts");
          return;
      }
    },
    [markRead, buildNavigateTarget, navigateWithModalSupport],
  );

  const handleDismiss = useCallback(
    (alertId: string) => {
      dismissAlert(alertId);
      setDismissedIds((prev) => new Set([...prev, alertId]));
    },
    [dismissAlert],
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    visibleAlerts.forEach((alert) => {
      if (hoveredId !== alert.id && !isQuietHours) {
        const timer = setTimeout(
          () => setDismissedIds((prev) => new Set([...prev, alert.id])),
          6000 + Math.random() * 2000,
        );
        timers.push(timer);
      }
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, [visibleAlerts, hoveredId, isQuietHours]);

  if (isQuietHours || visibleAlerts.length === 0) return null;

  const getIcon = (type: AlertType) => {
    switch (type) {
      case "session":
        return <Clock className="h-4 w-4" />;
      case "news":
        return <Calendar className="h-4 w-4" />;
      case "bias":
        return <TrendingUp className="h-4 w-4" />;
      case "exposure":
        return <AlertTriangle className="h-4 w-4" />;
      case "breaking":
        return <Radio className="h-4 w-4" />;
      case "price":
        return <Target className="h-4 w-4" />;
      case "level":
        return <BarChart2 className="h-4 w-4" />;
      case "risk":
        return <ShieldAlert className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityStyles = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "high":
        return "border-destructive/50 bg-destructive/10";
      case "warning":
        return "border-warning/50 bg-warning/10";
      default:
        return "border-border bg-card";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
      {visibleAlerts.map((alert, index) => (
        <div
          key={alert.id}
          className={cn(
            "p-3 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 cursor-pointer",
            getSeverityStyles(alert.severity),
            "animate-in slide-in-from-right-5 fade-in-0",
          )}
          style={{ animationDelay: `${index * 100}ms` }}
          onMouseEnter={() => setHoveredId(alert.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => handleAlertClick(alert)}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "p-1.5 rounded-md",
                alert.severity === "high"
                  ? "bg-destructive/20 text-destructive"
                  : alert.severity === "warning"
                    ? "bg-warning/20 text-warning"
                    : "bg-primary/20 text-primary",
              )}
            >
              {getIcon(alert.type)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>

              {(alert.routeTo || alert.relatedAsset || alert.eventId) && (
                <p className="text-[11px] text-muted-foreground mt-1">• click to open</p>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(alert.id);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
