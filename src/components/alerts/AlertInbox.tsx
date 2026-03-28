import { useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Inbox,
  CheckCheck,
  Clock,
  Bell,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Radio,
  Trash2,
  Target,
  BarChart2,
  ShieldAlert,
} from "lucide-react";

import type { AlertItem, AlertType } from "@/types/alerts";
import { cn } from "@/lib/utils";

interface AlertInboxProps {
  alerts: AlertItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onOpenCalendarEvent?: (eventId: string) => void;
  onOpenAlertItem?: (alert: AlertItem) => void;
}

export function AlertInbox({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll,
  onOpenCalendarEvent,
  onOpenAlertItem,
}: AlertInboxProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = useMemo(() => alerts.filter((alert) => !alert.read).length, [alerts]);

  const filteredAlerts = useMemo(() => {
    return filter === "unread" ? alerts.filter((alert) => !alert.read) : alerts;
  }, [alerts, filter]);

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

  const getSeverityStyles = (alert: AlertItem) => {
    if (alert.status === "pending") return "bg-primary/5 border-primary/20";
    if (alert.read) return "bg-muted/30 border-border/50";

    switch (alert.severity) {
      case "high":
        return "bg-destructive/5 border-destructive/30";
      case "warning":
        return "bg-warning/5 border-warning/30";
      default:
        return "bg-card border-border";
    }
  };

  const formatRelativeTime = (date: Date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Recently";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDueTime = (date?: Date) => {
    if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) return "Scheduled";

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    if (diffMs <= 0) return "Due now";

    const diffMins = Math.ceil(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (diffHours <= 0) return `Due in ${diffMins}m`;
    if (diffHours < 24) return `Due in ${diffHours}h ${mins}m`;

    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;
    return `Due in ${diffDays}d ${remHours}h`;
  };

  const getDisplayTime = (alert: AlertItem) => {
    if (alert.status === "pending") {
      return formatDueTime(alert.scheduledFor);
    }

    return formatRelativeTime(alert.triggeredAt ?? alert.timestamp);
  };

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
      if (target.startsWith("/asset/")) {
        navigate(target, { state: { backgroundLocation: location } });
        return;
      }

      navigate(target, { state: { backgroundLocation: location } });
    },
    [navigate, location],
  );

  const handleAlertOpen = useCallback(
    (alert: AlertItem) => {
      onMarkRead(alert.id);

      if (alert.eventId && onOpenCalendarEvent) {
        onOpenCalendarEvent(alert.eventId);
        return;
      }

      if (onOpenAlertItem && (alert.type === "breaking" || alert.type === "summary" || alert.type === "session")) {
        onOpenAlertItem(alert);
        return;
      }

      const target = buildNavigateTarget(alert);
      if (target) {
        navigateWithModalSupport(target);
      }
    },
    [onMarkRead, onOpenCalendarEvent, onOpenAlertItem, buildNavigateTarget, navigateWithModalSupport],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            Alert Inbox
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead} className="text-xs h-7">
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}

            {alerts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs h-7 text-muted-foreground">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as "all" | "unread")}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="all" className="text-xs">
              All ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-0">
            <ScrollArea className="h-[400px] pr-4">
              {filteredAlerts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No alerts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAlerts.map((alert) => {
                    const target = buildNavigateTarget(alert);
                    const isClickable = Boolean(
                      target ||
                      (alert.eventId && onOpenCalendarEvent) ||
                      ((alert.type === "breaking" || alert.type === "summary" || alert.type === "session") &&
                        onOpenAlertItem),
                    );

                    return (
                      <div
                        key={alert.id}
                        role={isClickable ? "button" : undefined}
                        tabIndex={isClickable ? 0 : -1}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          getSeverityStyles(alert),
                          isClickable ? "cursor-pointer hover:bg-muted/50" : "cursor-default",
                        )}
                        onPointerDown={(event) => {
                          if (!isClickable) return;
                          event.preventDefault();
                          handleAlertOpen(alert);
                        }}
                        onKeyDown={(event) => {
                          if (!isClickable) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleAlertOpen(alert);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "p-1.5 rounded-md mt-0.5 shrink-0",
                              alert.status === "pending"
                                ? "bg-primary/15 text-primary"
                                : alert.severity === "high"
                                  ? "bg-destructive/20 text-destructive"
                                  : alert.severity === "warning"
                                    ? "bg-warning/20 text-warning"
                                    : "bg-primary/20 text-primary",
                              alert.read && alert.status !== "pending" && "opacity-50",
                            )}
                          >
                            {getIcon(alert.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p
                                className={cn(
                                  "text-sm font-medium truncate",
                                  alert.read && alert.status !== "pending"
                                    ? "text-muted-foreground"
                                    : "text-foreground",
                                )}
                              >
                                {alert.title}
                              </p>

                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {getDisplayTime(alert)}
                              </span>
                            </div>

                            <p
                              className={cn(
                                "text-xs line-clamp-2",
                                alert.read && alert.status !== "pending"
                                  ? "text-muted-foreground/70"
                                  : "text-muted-foreground",
                              )}
                            >
                              {alert.message}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {alert.status === "pending" ? (
                                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                                  Pending
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Live
                                </Badge>
                              )}

                              {alert.recurrence === "event-series" && (
                                <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">
                                  Recurring
                                </Badge>
                              )}

                              {alert.relatedAsset && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {alert.relatedAsset}
                                </Badge>
                              )}

                              {isClickable && (
                                <span className="text-[11px] text-muted-foreground">• click to open</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!alert.read && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onDelete(alert.id);
                              }}
                              aria-label="Delete alert"
                              title="Delete alert"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
