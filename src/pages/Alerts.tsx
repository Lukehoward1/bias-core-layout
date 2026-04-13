import { useMemo, useState, useCallback, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Plus,
  Settings,
  Inbox,
  Bell,
  FlaskConical,
  Target,
  CalendarDays,
  Radio,
  AlertTriangle,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { AlertPreferencesPanel } from "@/components/alerts/AlertPreferencesPanel";
import { AlertInbox } from "@/components/alerts/AlertInbox";
import { TestAlertsPanel } from "@/components/alerts/TestAlertsPanel";
import { ManualTimerPanel } from "@/components/alerts/ManualTimerPanel";
import { PriceAlertsPanel } from "@/components/alerts/PriceAlertsPanel";
import { AlertsSoundToggle } from "@/components/alerts/AlertsSoundToggle";
import { CreatePriceAlertModal } from "@/components/alerts/CreatePriceAlertModal";
import { useAlertsContext } from "@/contexts/AlertsContext";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { toast } from "sonner";

import type { CalendarEvent } from "@/data/calendarEvents";
import type { AlertItem, PriceAlert } from "@/types/alerts";
import {
  getAllCalendarEvents,
  getEventDateTime,
  getNextEventByEventKey,
  getUpcomingCalendarEvents,
} from "@/services/calendarData";

type SessionCard = {
  name: string;
  status: "open" | "closed";
  time: string;
  accent: string;
  region: string;
};

type SessionConfig = {
  name: string;
  accent: string;
  region: string;
  timeZone: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
};

const SESSION_CONFIGS: SessionConfig[] = [
  {
    name: "Sydney",
    accent: "#2EC4B6",
    region: "Asia-Pacific Markets",
    timeZone: "Australia/Sydney",
    openHour: 9,
    openMinute: 0,
    closeHour: 17,
    closeMinute: 0,
  },
  {
    name: "Asia",
    accent: "#4361EE",
    region: "Asia-Pacific Markets",
    timeZone: "Asia/Tokyo",
    openHour: 9,
    openMinute: 0,
    closeHour: 15,
    closeMinute: 0,
  },
  {
    name: "London",
    accent: "#F4D35E",
    region: "European Markets",
    timeZone: "Europe/London",
    openHour: 8,
    openMinute: 0,
    closeHour: 16,
    closeMinute: 30,
  },
  {
    name: "New York",
    accent: "#F77F00",
    region: "US Markets",
    timeZone: "America/New_York",
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
  },
];

const formatCountdown = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getTimeZoneParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[get("weekday")] ?? 0,
    hour: Number(get("hour")) || 0,
    minute: Number(get("minute")) || 0,
    second: Number(get("second")) || 0,
  };
};

const buildSessionCard = (config: SessionConfig, now: Date): SessionCard => {
  const { weekday, hour, minute, second } = getTimeZoneParts(now, config.timeZone);

  const currentSeconds = hour * 3600 + minute * 60 + second;
  const openSeconds = config.openHour * 3600 + config.openMinute * 60;
  const closeSeconds = config.closeHour * 3600 + config.closeMinute * 60;

  const isWeekday = weekday >= 1 && weekday <= 5;
  const isOpen = isWeekday && currentSeconds >= openSeconds && currentSeconds < closeSeconds;

  if (isOpen) {
    return {
      name: config.name,
      status: "open",
      time: `Closes in ${formatCountdown(closeSeconds - currentSeconds)}`,
      accent: config.accent,
      region: config.region,
    };
  }

  let daysUntilOpen = 0;

  if (weekday === 6) {
    daysUntilOpen = 2;
  } else if (weekday === 0) {
    daysUntilOpen = 1;
  } else if (currentSeconds < openSeconds) {
    daysUntilOpen = 0;
  } else {
    daysUntilOpen = weekday === 5 ? 3 : 1;
  }

  const secondsUntilOpen =
    daysUntilOpen === 0
      ? openSeconds - currentSeconds
      : 24 * 3600 - currentSeconds + (daysUntilOpen - 1) * 24 * 3600 + openSeconds;

  return {
    name: config.name,
    status: "closed",
    time: `Opens in ${formatCountdown(secondsUntilOpen)}`,
    accent: config.accent,
    region: config.region,
  };
};

const formatWhenLabel = (date?: Date) => {
  if (!date || Number.isNaN(date.getTime())) return "Scheduled";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Due now";

  const diffMins = Math.ceil(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (diffHours <= 0) return `In ${diffMins}m`;
  if (diffHours < 24) return `In ${diffHours}h ${mins}m`;

  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  return `In ${diffDays}d ${remHours}h`;
};

const formatTriggeredLabel = (date?: Date) => {
  if (!date || Number.isNaN(date.getTime())) return "Triggered";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRecurringNextLabel = (date?: Date) => {
  if (!date || Number.isNaN(date.getTime())) return "Next release scheduled";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Next release due now";

  const diffMins = Math.ceil(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;

  if (diffDays > 0) return `Next release in ${diffDays}d ${remHours}h`;
  if (diffHours > 0) return `Next release in ${diffHours}h ${diffMins % 60}m`;
  return `Next release in ${diffMins}m`;
};

const getAlertTypeLabel = (alert: AlertItem) => {
  switch (alert.type) {
    case "breaking":
      return "Breaking News";
    case "summary":
      return "Summary";
    case "session":
      return "Session";
    case "news":
      return "Calendar News";
    case "bias":
      return "Bias";
    case "price":
      return "Price Alert";
    case "risk":
      return "Risk";
    case "exposure":
      return "Exposure";
    case "timer":
      return "Timer";
    default:
      return "Alert";
  }
};

const getAlertIcon = (alert: AlertItem) => {
  switch (alert.type) {
    case "breaking":
      return <Radio className="h-4 w-4 text-destructive" />;
    case "session":
      return <Clock className="h-4 w-4 text-primary" />;
    case "summary":
      return <TrendingUp className="h-4 w-4 text-primary" />;
    case "news":
      return <Calendar className="h-4 w-4 text-primary" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-primary" />;
  }
};

const isRecurringAlert = (alert: AlertItem) => {
  return alert.recurrence === "event-series";
};

type RecurringOverviewItem = {
  id: string;
  title: string;
  currency: string;
  nextRelease: Date;
  key: string;
  eventId: string;
};

type MyAlertsRow =
  | {
      id: string;
      kind: "recurring";
      typeLabel: string;
      what: string;
      when: string;
      statusLabel: string;
      statusVariant: "outline";
      recurringItem: RecurringOverviewItem;
      isRecurring: true;
    }
  | {
      id: string;
      kind: "scheduled";
      typeLabel: string;
      what: string;
      when: string;
      statusLabel: string;
      statusVariant: "outline";
      alertItem: AlertItem;
      isRecurring: false;
    }
  | {
      id: string;
      kind: "live";
      typeLabel: string;
      what: string;
      when: string;
      statusLabel: string;
      statusVariant: "secondary";
      alertItem: AlertItem;
      isRecurring: boolean;
    }
  | {
      id: string;
      kind: "price";
      typeLabel: string;
      what: string;
      when: string;
      statusLabel: "Active" | "Paused";
      statusVariant: "default" | "secondary";
      priceAlert: PriceAlert;
      isRecurring: false;
    };

export default function Alerts() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreatePriceAlert, setShowCreatePriceAlert] = useState(false);
  const [editingPriceAlert, setEditingPriceAlert] = useState<PriceAlert | null>(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedAlertItem, setSelectedAlertItem] = useState<AlertItem | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const {
    alerts,
    recurringSubscriptions,
    preferences,
    addAlert,
    markRead,
    markAllRead,
    deleteAlert,
    removeRecurringSubscription,
    clearAllAlerts,
    updatePreferences,
    unreadCount,
    priceAlerts,
  } = useAlertsContext();

  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();

  const topNewsCardId = "top-news";
  const sessionTimersCardId = "session-timers";
  const myAlertsTimersCardId = "alerts-my-alerts-timers";
  const priceAlertsCardId = "alerts-price-alerts";

  const isTopNewsAdded = isCardOnDashboard(topNewsCardId);
  const isSessionTimersAdded = isCardOnDashboard(sessionTimersCardId);
  const isMyAlertsTimersAdded = isCardOnDashboard(myAlertsTimersCardId);
  const isPriceAlertsAdded = isCardOnDashboard(priceAlertsCardId);

  const allCalendarEvents = useMemo(() => getAllCalendarEvents(), []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const dynamicSessions = useMemo<SessionCard[]>(() => {
    return SESSION_CONFIGS.map((session) => buildSessionCard(session, now));
  }, [now]);

  const handleAddCard = useCallback(
    (cardId: string) => {
      addCard(cardId);
      toast.success("Added to Dashboard");
    },
    [addCard],
  );

  const handleRemoveCard = useCallback(
    (cardId: string) => {
      removeCard(cardId);
      toast.success("Removed from Dashboard");
    },
    [removeCard],
  );

  const handleTimerComplete = useCallback(
    (label: string) => {
      addAlert({
        type: "timer",
        title: "Timer Complete",
        message: `Your timer "${label}" has finished.`,
        severity: "info",
        routeTo: "/alerts",
      });
    },
    [addAlert],
  );

  const activePriceAlertsCount = useMemo(
    () => priceAlerts.filter((alert) => !alert.triggered && alert.enabled).length,
    [priceAlerts],
  );

  const triggeredPriceAlertsCount = useMemo(() => priceAlerts.filter((alert) => alert.triggered).length, [priceAlerts]);

  const overviewActivePriceAlerts = useMemo(() => priceAlerts.filter((alert) => !alert.triggered), [priceAlerts]);

  const oneTimeScheduledAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => alert.status === "pending" && alert.recurrence !== "event-series")
        .sort((a, b) => {
          const aTime = a.scheduledFor?.getTime() ?? 0;
          const bTime = b.scheduledFor?.getTime() ?? 0;
          return aTime - bTime;
        }),
    [alerts],
  );

  const recurringOverviewItems = useMemo<RecurringOverviewItem[]>(() => {
    return recurringSubscriptions
      .map((sub) => {
        const matchedEvent = getNextEventByEventKey(sub.key);
        if (!matchedEvent) return null;

        return {
          id: sub.id,
          title: `${matchedEvent.event} (${matchedEvent.currency})`,
          currency: matchedEvent.currency,
          nextRelease: getEventDateTime(matchedEvent),
          key: sub.key,
          eventId: matchedEvent.id,
        };
      })
      .filter((item): item is RecurringOverviewItem => Boolean(item))
      .sort((a, b) => a.nextRelease.getTime() - b.nextRelease.getTime());
  }, [recurringSubscriptions]);

  const liveNonPriceAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => alert.status === "triggered" && alert.type !== "price")
        .sort((a, b) => {
          const aTime = (a.triggeredAt ?? a.timestamp).getTime();
          const bTime = (b.triggeredAt ?? b.timestamp).getTime();
          return bTime - aTime;
        }),
    [alerts],
  );

  const recentTriggeredSystemAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => alert.status === "triggered")
        .sort((a, b) => {
          const aTime = (a.triggeredAt ?? a.timestamp).getTime();
          const bTime = (b.triggeredAt ?? b.timestamp).getTime();
          return bTime - aTime;
        })
        .slice(0, 6),
    [alerts],
  );

  const myAlertsAndTimersRows = useMemo<MyAlertsRow[]>(() => {
    const recurringRows: MyAlertsRow[] = recurringOverviewItems.map((item) => ({
      id: `recurring-${item.id}`,
      kind: "recurring",
      typeLabel: "Calendar News",
      what: item.title,
      when: formatRecurringNextLabel(item.nextRelease),
      statusLabel: "Recurring",
      statusVariant: "outline",
      recurringItem: item,
      isRecurring: true,
    }));

    const scheduledRows: MyAlertsRow[] = oneTimeScheduledAlerts.map((alert) => ({
      id: `scheduled-${alert.id}`,
      kind: "scheduled",
      typeLabel: getAlertTypeLabel(alert),
      what: alert.title,
      when: formatWhenLabel(alert.scheduledFor),
      statusLabel: "Pending",
      statusVariant: "outline",
      alertItem: alert,
      isRecurring: false,
    }));

    const liveRows: MyAlertsRow[] = liveNonPriceAlerts.map((alert) => ({
      id: `live-${alert.id}`,
      kind: "live",
      typeLabel: getAlertTypeLabel(alert),
      what: alert.title,
      when: formatTriggeredLabel(alert.triggeredAt ?? alert.timestamp),
      statusLabel: "Live",
      statusVariant: "secondary",
      alertItem: alert,
      isRecurring: isRecurringAlert(alert),
    }));

    const priceRows: MyAlertsRow[] = overviewActivePriceAlerts.map((alert) => ({
      id: `price-${alert.id}`,
      kind: "price",
      typeLabel: "Price",
      what: `${alert.assetDisplayName} ${alert.direction} ${alert.price}`,
      when: alert.triggerType === "wick" ? "Touch" : `Close ${alert.timeframe}`,
      statusLabel: alert.enabled ? "Active" : "Paused",
      statusVariant: alert.enabled ? "default" : "secondary",
      priceAlert: alert,
      isRecurring: false,
    }));

    return [...recurringRows, ...scheduledRows, ...liveRows, ...priceRows];
  }, [recurringOverviewItems, oneTimeScheduledAlerts, liveNonPriceAlerts, overviewActivePriceAlerts]);

  const topNewsEvents = useMemo(() => {
    const now = Date.now();

    const upcoming = getAllCalendarEvents()
      .map((event) => ({
        ...event,
        ts: getEventDateTime(event).getTime(),
      }))
      .filter((event) => !Number.isNaN(event.ts) && event.ts >= now);

    const impactScore = (impact: string) => {
      if (impact === "high") return 3;
      if (impact === "medium") return 2;
      return 1;
    };

    const sorted = upcoming.sort((a, b) => {
      // 1. Higher impact first
      const impactDiff = impactScore(b.impact) - impactScore(a.impact);
      if (impactDiff !== 0) return impactDiff;

      // 2. Then closest time
      return a.ts - b.ts;
    });

    return sorted.slice(0, 5);
  }, []);

  const openCalendarEvent = useCallback((event: CalendarEvent) => {
    setIsAlertModalOpen(false);
    setSelectedAlertItem(null);
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);

    requestAnimationFrame(() => {
      setSelectedCalendarEvent(event);
      setIsEventModalOpen(true);
    });
  }, []);

  const openCalendarEventById = useCallback(
    (eventId: string) => {
      const matchedEvent = allCalendarEvents.find((event) => event.id === eventId);
      if (!matchedEvent) return;
      openCalendarEvent(matchedEvent);
    },
    [allCalendarEvents, openCalendarEvent],
  );

  const openGenericAlert = useCallback((alert: AlertItem) => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
    setIsAlertModalOpen(false);
    setSelectedAlertItem(null);

    requestAnimationFrame(() => {
      setSelectedAlertItem(alert);
      setIsAlertModalOpen(true);
    });
  }, []);

  const closeCalendarOverlay = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
  }, []);

  const closeAlertOverlay = useCallback(() => {
    setIsAlertModalOpen(false);
    setSelectedAlertItem(null);
  }, []);

  const handleTopNewsClick = useCallback(
    (event: CalendarEvent) => {
      openCalendarEvent(event);
    },
    [openCalendarEvent],
  );

  const openCreatePriceAlert = useCallback(() => {
    if (isEventModalOpen) {
      closeCalendarOverlay();
      requestAnimationFrame(() => {
        setEditingPriceAlert(null);
        setShowCreatePriceAlert(true);
      });
      return;
    }

    if (isAlertModalOpen) {
      closeAlertOverlay();
      requestAnimationFrame(() => {
        setEditingPriceAlert(null);
        setShowCreatePriceAlert(true);
      });
      return;
    }

    setEditingPriceAlert(null);
    setShowCreatePriceAlert(true);
  }, [isEventModalOpen, isAlertModalOpen, closeCalendarOverlay, closeAlertOverlay]);

  const openEditPriceAlert = useCallback(
    (alert: PriceAlert) => {
      if (isEventModalOpen) {
        closeCalendarOverlay();
        requestAnimationFrame(() => {
          setEditingPriceAlert(alert);
          setShowCreatePriceAlert(true);
        });
        return;
      }

      if (isAlertModalOpen) {
        closeAlertOverlay();
        requestAnimationFrame(() => {
          setEditingPriceAlert(alert);
          setShowCreatePriceAlert(true);
        });
        return;
      }

      setEditingPriceAlert(alert);
      setShowCreatePriceAlert(true);
    },
    [isEventModalOpen, isAlertModalOpen, closeCalendarOverlay, closeAlertOverlay],
  );

  const handlePriceAlertModalOpenChange = useCallback((open: boolean) => {
    setShowCreatePriceAlert(open);
    if (!open) {
      setEditingPriceAlert(null);
    }
  }, []);

  const openAlertRow = useCallback(
    (alert: AlertItem) => {
      if (alert.eventId) {
        openCalendarEventById(alert.eventId);
        return;
      }

      openGenericAlert(alert);
    },
    [openCalendarEventById, openGenericAlert],
  );

  const openRecurringRow = useCallback(
    (eventId: string) => {
      openCalendarEventById(eventId);
    },
    [openCalendarEventById],
  );

  const openTriggeredAlert = useCallback(
    (alert: AlertItem) => {
      if (alert.eventId) {
        openCalendarEventById(alert.eventId);
        return;
      }

      openGenericAlert(alert);
    },
    [openCalendarEventById, openGenericAlert],
  );

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Alerts" />

      <div className="max-w-7xl mx-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="h-9">
              <TabsTrigger value="overview" className="text-sm gap-2">
                <Bell className="h-4 w-4" />
                Overview
              </TabsTrigger>

              <TabsTrigger value="price-alerts" className="text-sm gap-2">
                <Target className="h-4 w-4" />
                Price Alerts
                {activePriceAlertsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-1">
                    {activePriceAlertsCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="inbox" className="text-sm gap-2">
                <Inbox className="h-4 w-4" />
                Inbox
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5 ml-1">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="preferences" className="text-sm gap-2">
                <Settings className="h-4 w-4" />
                Preferences
              </TabsTrigger>

              <TabsTrigger value="testing" className="text-sm gap-2">
                <FlaskConical className="h-4 w-4" />
                Test
              </TabsTrigger>
            </TabsList>

            <AlertsSoundToggle />
          </div>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Top News</CardTitle>
                  <AddToDashboardButton
                    isAdded={isTopNewsAdded}
                    onAdd={() => handleAddCard(topNewsCardId)}
                    onRemove={() => handleRemoveCard(topNewsCardId)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topNewsEvents.length === 0 ? (
                      <div className="p-4 bg-muted/30 rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">No upcoming calendar events found.</p>
                      </div>
                    ) : (
                      topNewsEvents.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleTopNewsClick(item);
                          }}
                          className="w-full text-left p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm text-foreground mb-2">{item.event}</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {item.currency}
                                </Badge>
                                <Badge
                                  variant={
                                    item.impact === "high"
                                      ? "destructive"
                                      : item.impact === "medium"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {item.impact}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground ml-1">• click to view event</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="block text-xs text-muted-foreground whitespace-nowrap">
                                {getEventDateTime(item).toLocaleDateString([], {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                              <span className="block text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Session Timers</CardTitle>
                  <AddToDashboardButton
                    isAdded={isSessionTimersAdded}
                    onAdd={() => handleAddCard(sessionTimersCardId)}
                    onRemove={() => handleRemoveCard(sessionTimersCardId)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dynamicSessions.map((session) => (
                      <div
                        key={session.name}
                        className="relative p-4 bg-muted/50 rounded-lg border border-border overflow-hidden"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[3px]"
                          style={{ backgroundColor: session.accent }}
                        />
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm text-foreground">{session.name}</h3>
                          <Badge variant={session.status === "open" ? "default" : "secondary"} className="text-xs">
                            {session.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mb-2">{session.region}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs tabular-nums">{session.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>My Alerts & Timers</CardTitle>
                  <div className="flex items-center gap-2">
                    <AddToDashboardButton
                      isAdded={isMyAlertsTimersAdded}
                      onAdd={() => handleAddCard(myAlertsTimersCardId)}
                      onRemove={() => handleRemoveCard(myAlertsTimersCardId)}
                    />
                    <Button size="sm" className="h-8" onClick={openCreatePriceAlert}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Alert
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="overflow-x-auto -mx-5">
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="w-[180px] text-left py-3 px-5 text-xs font-medium text-muted-foreground">
                            Type
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">What</th>
                          <th className="w-[180px] text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                            When
                          </th>
                          <th className="w-[110px] text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                            Status
                          </th>
                          <th className="w-[150px] text-left py-3 px-5 text-xs font-medium text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {myAlertsAndTimersRows.map((row) => (
                          <tr key={row.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-5 align-top text-sm text-foreground">
                              <div className="flex items-start gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  {row.typeLabel}
                                </Badge>

                                {row.kind !== "price" && row.isRecurring && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-warning/40 text-warning whitespace-nowrap"
                                  >
                                    Recurring
                                  </Badge>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 align-top text-sm text-foreground font-medium">
                              <div className="break-words leading-5">{row.what}</div>
                            </td>

                            <td className="py-3 px-4 align-top text-sm text-muted-foreground">
                              <span className="block whitespace-normal break-words leading-5">{row.when}</span>
                            </td>

                            <td className="py-3 px-4 align-top">
                              <Badge variant={row.statusVariant} className="text-xs whitespace-nowrap">
                                {row.statusLabel}
                              </Badge>
                            </td>

                            <td className="py-3 px-5 align-top">
                              <div className="flex items-center gap-2 flex-wrap">
                                {row.kind === "price" ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => openEditPriceAlert(row.priceAlert)}
                                  >
                                    Edit
                                  </Button>
                                ) : row.kind === "recurring" ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        openRecurringRow(row.recurringItem.eventId);
                                      }}
                                    >
                                      View
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                                      onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        removeRecurringSubscription(row.recurringItem.id);
                                      }}
                                    >
                                      Stop
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        openAlertRow(row.alertItem);
                                      }}
                                    >
                                      View
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                                      onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        deleteAlert(row.alertItem.id);
                                      }}
                                    >
                                      {row.kind === "scheduled" ? "Cancel" : "Remove"}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}

                        {myAlertsAndTimersRows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                              No active alerts. Click "Add Alert" or schedule one from a calendar event.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alerts Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{oneTimeScheduledAlerts.length}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{liveNonPriceAlerts.length}</p>
                      <p className="text-xs text-muted-foreground">Live Alerts</p>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{recurringOverviewItems.length}</p>
                      <p className="text-xs text-muted-foreground">Recurring</p>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{activePriceAlertsCount}</p>
                      <p className="text-xs text-muted-foreground">Active Price</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Bell className="h-4 w-4 text-primary" />
                      Recurring Alerts
                    </div>

                    {recurringOverviewItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recurring alerts set.</p>
                    ) : (
                      <div className="space-y-2">
                        {recurringOverviewItems.slice(0, 4).map((item) => (
                          <div key={item.id} className="p-3 rounded-lg border border-warning/20 bg-warning/5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                              <Badge
                                variant="outline"
                                className="text-[10px] border-warning/40 text-warning whitespace-nowrap"
                              >
                                Recurring
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatRecurringNextLabel(item.nextRelease)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      Pending News & Timers
                    </div>

                    {oneTimeScheduledAlerts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending scheduled alerts.</p>
                    ) : (
                      <div className="space-y-2">
                        {oneTimeScheduledAlerts.slice(0, 4).map((alert) => (
                          <div key={alert.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                              <Badge
                                variant="outline"
                                className="text-[10px] border-primary/30 text-primary whitespace-nowrap"
                              >
                                Pending
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{formatWhenLabel(alert.scheduledFor)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <Button className="w-full" onClick={openCreatePriceAlert}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Price Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="price-alerts" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <PriceAlertsPanel />

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Price Alerts Summary</CardTitle>
                  <AddToDashboardButton
                    isAdded={isPriceAlertsAdded}
                    onAdd={() => handleAddCard(priceAlertsCardId)}
                    onRemove={() => handleRemoveCard(priceAlertsCardId)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{activePriceAlertsCount}</p>
                      <p className="text-xs text-muted-foreground">Active Alerts</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{triggeredPriceAlertsCount}</p>
                      <p className="text-xs text-muted-foreground">Triggered</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button className="w-full" onClick={openCreatePriceAlert}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Price Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inbox" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <AlertInbox
                  alerts={alerts}
                  onMarkRead={markRead}
                  onMarkAllRead={markAllRead}
                  onDelete={deleteAlert}
                  onClearAll={clearAllAlerts}
                  onOpenCalendarEvent={openCalendarEventById}
                  onOpenAlertItem={openGenericAlert}
                />
              </div>

              <div className="space-y-5">
                <ManualTimerPanel onTimerComplete={handleTimerComplete} />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Radio className="h-4 w-4 text-primary" />
                      Recent Triggered Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentTriggeredSystemAlerts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No live alerts yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentTriggeredSystemAlerts.slice(0, 5).map((alert) => {
                          const isClickable = Boolean(
                            alert.eventId || ["breaking", "summary", "session"].includes(alert.type),
                          );

                          return (
                            <button
                              key={alert.id}
                              type="button"
                              disabled={!isClickable}
                              onPointerDown={(event) => {
                                if (!isClickable) return;
                                event.preventDefault();
                                event.stopPropagation();
                                openTriggeredAlert(alert);
                              }}
                              className={`w-full text-left p-3 rounded-lg border bg-muted/40 transition-colors ${
                                isClickable
                                  ? "border-border hover:bg-muted/60 cursor-pointer"
                                  : "border-border cursor-default opacity-90"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                                  {isRecurringAlert(alert) && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] border-warning/40 text-warning whitespace-nowrap"
                                    >
                                      Recurring
                                    </Badge>
                                  )}
                                </div>

                                <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                                  Live
                                </Badge>
                              </div>

                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTriggeredLabel(alert.triggeredAt ?? alert.timestamp)}
                              </p>

                              {isClickable && <p className="text-[11px] text-muted-foreground mt-1">• click to open</p>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="mt-6">
            <div className="max-w-2xl">
              <AlertPreferencesPanel preferences={preferences} onUpdate={updatePreferences} />
            </div>
          </TabsContent>

          <TabsContent value="testing" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TestAlertsPanel onTriggerAlert={addAlert} />
              <ManualTimerPanel onTimerComplete={handleTimerComplete} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <EventDetailsModal
        event={selectedCalendarEvent}
        isOpen={isEventModalOpen}
        onClose={closeCalendarOverlay}
        openedFromAlert={true}
      />

      <DialogPrimitive.Root open={isAlertModalOpen} onOpenChange={(open) => !open && closeAlertOverlay()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000]"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeAlertOverlay();
            }}
          />

          <DialogPrimitive.Content
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[94vw] max-w-2xl bg-background border border-border rounded-lg p-0 z-[10001] shadow-2xl"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {selectedAlertItem && (
              <>
                <div className="border-b border-border px-6 py-5 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      Opened from alert
                    </Badge>

                    <Badge variant="outline" className="text-xs">
                      {getAlertTypeLabel(selectedAlertItem)}
                    </Badge>

                    <Badge
                      className={
                        selectedAlertItem.severity === "high"
                          ? "bg-destructive text-destructive-foreground"
                          : selectedAlertItem.severity === "warning"
                            ? "bg-warning text-warning-foreground"
                            : "bg-primary text-primary-foreground"
                      }
                    >
                      {selectedAlertItem.severity.toUpperCase()}
                    </Badge>

                    {isRecurringAlert(selectedAlertItem) && (
                      <Badge variant="outline" className="text-xs border-warning/40 text-warning">
                        Recurring
                      </Badge>
                    )}

                    {selectedAlertItem.relatedAsset && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedAlertItem.relatedAsset}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-muted/60 p-2 shrink-0">{getAlertIcon(selectedAlertItem)}</div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-foreground">{selectedAlertItem.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatTriggeredLabel(selectedAlertItem.triggeredAt ?? selectedAlertItem.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                  <Card className="bg-muted/20 border-border/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getAlertIcon(selectedAlertItem)}
                        Alert Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedAlertItem.message}</p>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button onClick={closeAlertOverlay}>Close</Button>
                  </div>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <CreatePriceAlertModal
        open={showCreatePriceAlert}
        onOpenChange={handlePriceAlertModalOpenChange}
        editingAlert={editingPriceAlert}
      />
    </div>
  );
}
