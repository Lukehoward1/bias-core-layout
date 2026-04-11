import { useState, useEffect, useCallback, useMemo } from "react";
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

  const visibleAlerts = useMemo(() => {
    return alerts.filter((alert) => !alert.read && !dismissedIds.has(alert.id)).slice(0, 3);
  }, [alerts, dismissedIds]);

  const applyRouteParams = useCallback((route: string, params?: Record<string, string>) => {
    if (!params) return route;

    let resolved = route;
    for (const [key, value] of Object.entries(params)) {
      resolved = resolved.replace(`:${key}`, encodeURIComponent(value));
    }

    return resolved;
  }, []);

  const buildNavigateTarget = useCallback(
    (alert: AlertItem) => {
      if (alert.routeTo) {
        let target = applyRouteParams(alert.routeTo, alert.routeParams);

        if (alert.eventId && target.startsWith("/calendar")) {
          const joiner = target.includes("?") ? "&" : "?";
          target = `${target}${joiner}eventId=${encodeURIComponent(alert.eventId)}`;
        }

        return target;
      }

      switch (alert.type) {
        case "bias":
        case "price":
        case "level":
          if (alert.relatedAsset) {
            return `/asset/${encodeURIComponent(alert.relatedAsset)}`;
          }
          return "/markets";

        case "news":
        case "summary":
        case "breaking":
          if (alert.eventId) {
            return `/calendar?eventId=${encodeURIComponent(alert.eventId)}`;
          }
          return "/calendar";

        case "risk":
        case "exposure":
          return "/risk-tools";

        case "session":
          return "/alerts";

        default:
          return null;
      }
    },
    [applyRouteParams],
  );

  const navigateWithModalSupport = useCallback(
    (target: string) => {
      navigate(target, {
        state: {
          backgroundLocation: location,
          openedFromAlert: true,
        },
      });
    },
    [navigate, location],
  );

  const handleAlertClick = useCallback(
    (alert: AlertItem) => {
      const target = buildNavigateTarget(alert);
      if (!target) return;

      markRead(alert.id);
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(alert.id);
        return next;
      });

      navigateWithModalSupport(target);
    },
    [buildNavigateTarget, markRead, navigateWithModalSupport],
  );

  const handleDismiss = useCallback(
    (alertId: string) => {
      dismissAlert(alertId);
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(alertId);
        return next;
      });
    },
    [dismissAlert],
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    visibleAlerts.forEach((alert) => {
      if (hoveredId === alert.id || isQuietHours) return;

      const timer = setTimeout(
        () => {
          setDismissedIds((prev) => {
            const next = new Set(prev);
            next.add(alert.id);
            return next;
          });
        },
        6000 + Math.random() * 2000,
      );

      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [visibleAlerts, hoveredId, isQuietHours]);

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

  const getIconStyles = (severity: AlertItem["severity"]) => {
    switch (severity) {
      case "high":
        return "bg-destructive/20 text-destructive";
      case "warning":
        return "bg-warning/20 text-warning";
      default:
        return "bg-primary/20 text-primary";
    }
  };

  if (isQuietHours || visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
      {visibleAlerts.map((alert, index) => {
        const isClickable = Boolean(buildNavigateTarget(alert));

        return (
          <div
            key={alert.id}
            className={cn(
              "p-3 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300",
              "animate-in slide-in-from-right-5 fade-in-0",
              isClickable ? "cursor-pointer hover:bg-muted/40" : "cursor-default",
              getSeverityStyles(alert.severity),
            )}
            style={{ animationDelay: `${index * 100}ms` }}
            onMouseEnter={() => setHoveredId(alert.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => {
              if (!isClickable) return;
              handleAlertClick(alert);
            }}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : -1}
            onKeyDown={(event) => {
              if (!isClickable) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleAlertClick(alert);
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div className={cn("p-1.5 rounded-md shrink-0", getIconStyles(alert.severity))}>
                {getIcon(alert.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>

                {isClickable && <p className="text-[11px] text-muted-foreground mt-1">• click to open</p>}
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDismiss(alert.id);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
