import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Clock,
  Bell,
  AlertTriangle,
  Activity,
  Target,
  Shield,
  Brain,
  BarChart3,
  PieChart,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { QuickRiskCalculator } from "@/components/risk/QuickRiskCalculator";
import { PositionSizeCalculator } from "@/components/risk/PositionSizeCalculator";
import { RiskRewardCalculator } from "@/components/risk/RiskRewardCalculator";
import { DailyRiskLimitTracker } from "@/components/risk/DailyRiskLimitTracker";
import { MaxDrawdownGuard } from "@/components/risk/MaxDrawdownGuard";
import { WatchlistOverviewCard } from "@/components/dashboard/WatchlistOverviewCard";
import { useAlertsContext } from "@/contexts/AlertsContext";
import { getAllCalendarEvents, getEventDateTime } from "@/services/calendarData";

/* =======================
   SHARED DATA
======================= */

const getSampleEquityData = () => {
  const sampleTrades = [
    { date: "2025-01-03", pnl: 450 },
    { date: "2025-01-06", pnl: 300 },
    { date: "2025-01-08", pnl: -400 },
    { date: "2025-01-10", pnl: 480 },
    { date: "2025-01-12", pnl: -400 },
    { date: "2025-01-13", pnl: -73 },
    { date: "2025-01-14", pnl: 1350 },
    { date: "2025-01-15", pnl: 600 },
  ];

  let cumulative = 0;

  return sampleTrades.map((trade) => {
    cumulative += trade.pnl;

    return {
      date: trade.date,
      equity: cumulative,
      formattedDate: trade.date.split("-").slice(1).join("/"),
    };
  });
};

const equityData = getSampleEquityData();

export interface CardRenderContext {
  slotType: "wide" | "narrow" | "equal" | "hero" | "kpi" | "wide-narrow" | "three-equal" | "four-equal";
}

type WatchlistSlotType = "wide" | "narrow" | "equal" | "hero" | "kpi";

const normalizeWatchlistSlotType = (slotType: CardRenderContext["slotType"]): WatchlistSlotType => {
  if (slotType === "wide-narrow") return "wide";
  if (slotType === "three-equal" || slotType === "four-equal") return "equal";
  return slotType;
};

/* =======================
   LIVE HELPERS
======================= */

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

const impactRank = (impact: "high" | "medium" | "low") => {
  if (impact === "high") return 3;
  if (impact === "medium") return 2;
  return 1;
};

/**
 * Returns only the NEXT upcoming instance for each unique eventKey.
 * This prevents cards from filling with repeated recurring instances
 * of the same event, such as BOJ appearing multiple times.
 */
const getUniqueUpcomingEvents = () => {
  const now = Date.now();
  const nextByDisplayKey = new Map<string, ReturnType<typeof getAllCalendarEvents>[number] & { ts: number }>();

  getAllCalendarEvents()
    .map((event) => {
      const eventDate = getEventDateTime(event);
      return {
        ...event,
        ts: eventDate.getTime(),
      };
    })
    .filter((event) => !Number.isNaN(event.ts) && event.ts >= now)
    .forEach((event) => {
      const displayKey = `${event.currency}-${event.event}`.toLowerCase().trim();
      const existing = nextByDisplayKey.get(displayKey);

      if (!existing || event.ts < existing.ts) {
        nextByDisplayKey.set(displayKey, event);
      }
    });

  return Array.from(nextByDisplayKey.values()).sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts;

    const byImpact = impactRank(b.impact) - impactRank(a.impact);
    if (byImpact !== 0) return byImpact;

    return a.event.localeCompare(b.event);
  });
};

const getSortedUpcomingEvents = () => {
  return [...getUniqueUpcomingEvents()].sort((a, b) => {
    const byImpact = impactRank(b.impact) - impactRank(a.impact);
    if (byImpact !== 0) return byImpact;
    return a.ts - b.ts;
  });
};

const formatRelativeRelease = (date: Date) => {
  if (Number.isNaN(date.getTime())) return "Upcoming";

  const diffMs = date.getTime() - Date.now();
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

const formatDashboardDate = (date: Date) => {
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
};

/* =======================
   SHARED NAVIGATION
======================= */

function useDashboardEventNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (eventId: string) => {
      navigate(`/calendar?eventId=${encodeURIComponent(eventId)}`, {
        state: {
          backgroundLocation: location,
        },
      });
    },
    [navigate, location],
  );
}

/* =======================
   LIVE DASHBOARD CARDS
======================= */

function AlertsSummaryDashboardCard() {
  const navigate = useNavigate();
  const { alerts, recurringSubscriptions, priceAlerts } = useAlertsContext();

  const pendingCount = useMemo(
    () => alerts.filter((alert) => alert.status === "pending" && alert.recurrence !== "event-series").length,
    [alerts],
  );

  const liveAlertsCount = useMemo(
    () => alerts.filter((alert) => alert.status === "triggered" && alert.type !== "price").length,
    [alerts],
  );

  const activePriceCount = useMemo(
    () => priceAlerts.filter((alert) => !alert.triggered && alert.enabled).length,
    [priceAlerts],
  );

  const recurringOverviewItems = useMemo(() => {
    return recurringSubscriptions
      .map((sub) => {
        const matchedEvent = getAllCalendarEvents().find((event) => event.eventKey === sub.key);
        if (!matchedEvent) return null;

        return {
          id: sub.id,
          title: `${matchedEvent.event} (${matchedEvent.currency})`,
          nextRelease: getEventDateTime(matchedEvent),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.nextRelease.getTime() - b!.nextRelease.getTime())
      .slice(0, 1) as Array<{
      id: string;
      title: string;
      nextRelease: Date;
    }>;
  }, [recurringSubscriptions]);

  const pendingItems = useMemo(() => {
    return alerts
      .filter((alert) => alert.status === "pending" && alert.recurrence !== "event-series")
      .sort((a, b) => {
        const aTime = a.scheduledFor?.getTime() ?? 0;
        const bTime = b.scheduledFor?.getTime() ?? 0;
        return aTime - bTime;
      })
      .slice(0, 1);
  }, [alerts]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Alerts Summary</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-foreground mt-1">{pendingCount}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Live Alerts</p>
            <p className="text-2xl font-bold text-foreground mt-1">{liveAlertsCount}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Recurring</p>
            <p className="text-2xl font-bold text-foreground mt-1">{recurringSubscriptions.length}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Active Price</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activePriceCount}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Bell className="h-4 w-4 text-primary" />
            Recurring Alerts
          </div>

          {recurringOverviewItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recurring alerts set.</p>
          ) : (
            recurringOverviewItems.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-warning/20 bg-warning/5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-warning/40 text-warning whitespace-nowrap">
                    Recurring
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatRecurringNextLabel(item.nextRelease)}</p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Pending News & Timers
          </div>

          {pendingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending scheduled alerts.</p>
          ) : (
            pendingItems.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
              </div>
            ))
          )}
        </div>

        <Button className="w-full" onClick={() => navigate("/alerts")}>
          Open Alerts
        </Button>
      </CardContent>
    </Card>
  );
}

function SessionTimersDashboardCard() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const dynamicSessions = useMemo(() => {
    return SESSION_CONFIGS.map((session) => buildSessionCard(session, now));
  }, [now]);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Session Timers</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {dynamicSessions.map((session) => (
            <div
              key={session.name}
              className="relative p-2 rounded-lg bg-muted/50 border border-border overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: session.accent }} />
              <div className="flex items-center justify-between pl-2">
                <div>
                  <p className="text-xs font-medium text-foreground">{session.name}</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">{session.time}</p>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    session.status === "open" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopNewsDashboardCard() {
  const openEvent = useDashboardEventNavigation();
  const events = useMemo(() => getSortedUpcomingEvents().slice(0, 3), []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top News</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming calendar events found.</p>
          ) : (
            events.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEvent(item.id)}
                className="w-full text-left p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.event}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.currency}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.impact === "high"
                            ? "bg-destructive/20 text-destructive"
                            : item.impact === "medium"
                              ? "bg-warning/20 text-warning"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.impact}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">• click to open</p>
                  </div>

                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatRelativeRelease(getEventDateTime(item))}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingEventsDashboardCard() {
  const openEvent = useDashboardEventNavigation();
  const events = useMemo(() => getUniqueUpcomingEvents().slice(0, 4), []);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events found.</p>
          ) : (
            events.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEvent(item.id)}
                className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.impact === "high" ? "bg-destructive" : item.impact === "medium" ? "bg-warning" : "bg-success"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.event}</p>
                    <span className="text-[10px] text-muted-foreground">{item.currency}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDashboardDate(getEventDateTime(item))} {item.time}
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">click to open</span>
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HighImpactEventsDashboardCard() {
  const openEvent = useDashboardEventNavigation();
  const events = useMemo(
    () =>
      getSortedUpcomingEvents()
        .filter((event) => event.impact === "high")
        .slice(0, 3),
    [],
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle className="text-sm font-medium">High Impact Events</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No high-impact events found.</p>
          ) : (
            events.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEvent(item.id)}
                className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.event}</p>
                    <span className="text-[10px] text-muted-foreground">{item.currency}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{item.time}</span>
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarEventsDashboardCard() {
  const openEvent = useDashboardEventNavigation();
  const events = useMemo(() => getUniqueUpcomingEvents().slice(0, 4), []);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Week Ahead</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events found.</p>
          ) : (
            events.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEvent(item.id)}
                className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{item.event}</p>
                  <p className="text-[10px] text-muted-foreground">{item.currency}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{formatDashboardDate(getEventDateTime(item))}</span>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* =======================
   CARD RENDERERS
======================= */

export const CARD_RENDERERS: Record<string, (ctx: CardRenderContext) => React.ReactNode> = {
  "todays-bias": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Bias</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-success">Bullish</p>
            <p className="text-xs text-muted-foreground mt-1">Multi-timeframe alignment</p>
          </div>
          <TrendingUp className="h-6 w-6 text-success" />
        </div>
      </CardContent>
    </Card>
  ),

  "active-trades": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Active Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">3</p>
        <p className="text-xs text-muted-foreground mt-1">2 long · 1 short</p>
      </CardContent>
    </Card>
  ),

  "next-session": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Next Session</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">London</p>
        <p className="text-xs text-muted-foreground mt-1">Opens in 2h 15m</p>
      </CardContent>
    </Card>
  ),

  "high-impact-events": () => <HighImpactEventsDashboardCard />,

  "watchlist-overview": ({ slotType }) => <WatchlistOverviewCard slotType={normalizeWatchlistSlotType(slotType)} />,

  "performance-overview": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Performance Overview</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Weekly</p>
            <p className="text-lg font-bold text-success">+£842</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Monthly</p>
            <p className="text-lg font-bold text-success">+£2,307</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "risk-snapshot": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Risk Snapshot</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm text-foreground">Daily Risk Used</span>
            <span className="text-sm font-medium text-foreground">42%</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm text-foreground">Open Exposure</span>
            <span className="text-sm font-medium text-foreground">1.8%</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm text-foreground">Drawdown</span>
            <span className="text-sm font-medium text-warning">-2.4%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "pinned-journal-equity": ({ slotType }) => {
    const chartHeight = slotType === "hero" ? "h-64" : "h-40";

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Journal Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="pinnedEquityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Equity"]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--primary))"
                  fill="url(#pinnedEquityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  "reports-kpi-total-pnl": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Total P&amp;L</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">+£2,307</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-avg-rr": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Avg R:R</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">1.85</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-win-rate": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">66.7%</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-expectancy": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Expectancy</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">£256/trade</p>
      </CardContent>
    </Card>
  ),

  "reports-overview-best-day": () => (
    <Card className="h-full bg-success/5 border-success/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          <CardTitle className="text-sm font-medium text-muted-foreground">Best Winning Day</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">+£1,200</p>
        <p className="text-xs text-muted-foreground mt-1">2025-01-14</p>
      </CardContent>
    </Card>
  ),

  "reports-overview-worst-day": () => (
    <Card className="h-full bg-destructive/5 border-destructive/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-destructive" />
          <CardTitle className="text-sm font-medium text-muted-foreground">Worst Losing Day</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-destructive">-£400</p>
        <p className="text-xs text-muted-foreground mt-1">2025-01-12</p>
      </CardContent>
    </Card>
  ),

  "reports-overview-equity": ({ slotType }) => {
    const chartHeight = slotType === "hero" ? "h-64" : "h-40";

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="overviewEquityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Equity"]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--primary))"
                  fill="url(#overviewEquityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  "reports-overview-rolling30": ({ slotType }) => {
    const chartHeight = slotType === "hero" ? "h-64" : "h-40";

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Rolling 30-Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Cumulative P&amp;L"]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  "reports-overview-edge": () => (
    <Card className="h-full border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Your Strongest Edge</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">High-confidence setups with 4+ star ratings</p>
      </CardContent>
    </Card>
  ),

  "reports-sessions-comparison": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Session Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="text-xs text-muted-foreground">London</p>
            <p className="text-lg font-bold text-success">71%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">New York</p>
            <p className="text-lg font-bold text-foreground">65%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Asian</p>
            <p className="text-lg font-bold text-foreground">58%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "reports-sessions-recommendations": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Session Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="text-xs text-success font-medium">✓ Best Session</p>
            <p className="text-sm font-medium text-foreground">London</p>
            <p className="text-xs text-muted-foreground">71% win rate, £450 avg profit</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-xs text-destructive font-medium">✗ Avoid</p>
            <p className="text-sm font-medium text-foreground">Asian (Low Volume)</p>
            <p className="text-xs text-muted-foreground">42% win rate, -£85 avg</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "reports-assets-pnl": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">P&amp;L by Instrument</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { pair: "EUR/USD", pnl: "+£1,250", trades: 45, color: "text-success" },
            { pair: "GBP/USD", pnl: "+£820", trades: 32, color: "text-success" },
            { pair: "USD/JPY", pnl: "-£180", trades: 18, color: "text-destructive" },
          ].map((item) => (
            <div key={item.pair} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{item.pair}</span>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${item.color}`}>{item.pnl}</p>
                <p className="text-xs text-muted-foreground">{item.trades} trades</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "reports-assets-table": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Instrument Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs text-muted-foreground">Pair</th>
                <th className="text-right py-2 text-xs text-muted-foreground">Win %</th>
                <th className="text-right py-2 text-xs text-muted-foreground">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2">EUR/USD</td>
                <td className="text-right text-success">68%</td>
                <td className="text-right text-success">+£1,250</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2">GBP/USD</td>
                <td className="text-right text-success">62%</td>
                <td className="text-right text-success">+£820</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  ),

  "reports-setup-best-worst": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Best &amp; Worst Setups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border-success/30 bg-success/5 border">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <p className="text-xs font-medium text-muted-foreground">Best</p>
            </div>
            <p className="text-sm font-bold text-success">5 Star</p>
            <p className="text-xs text-muted-foreground">£320/trade</p>
          </div>
          <div className="p-3 rounded-lg border-destructive/30 bg-destructive/5 border">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <p className="text-xs font-medium text-muted-foreground">Worst</p>
            </div>
            <p className="text-sm font-bold text-destructive">1 Star</p>
            <p className="text-xs text-muted-foreground">-£85/trade</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "reports-setup-patterns": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Common Patterns</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {["Breakout", "Pullback", "Reversal"].map((pattern, i) => (
            <div key={pattern} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm text-foreground">{pattern}</span>
              <span className="text-xs text-muted-foreground">{[32, 28, 15][i]} trades</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "reports-psychology-sentiment": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Sentiment Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-success">68%</p>
            <p className="text-xs text-muted-foreground">Positive</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">32%</p>
            <p className="text-xs text-muted-foreground">Negative</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "reports-psychology-triggers": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Emotional Triggers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { trigger: "FOMO", impact: "High", color: "text-destructive" },
            { trigger: "Revenge Trading", impact: "Medium", color: "text-amber-500" },
            { trigger: "Overconfidence", impact: "Low", color: "text-muted-foreground" },
          ].map((item) => (
            <div key={item.trigger} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{item.trigger}</span>
              </div>
              <span className={`text-xs font-medium ${item.color}`}>{item.impact}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "reports-psychology-improvement": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Improvement Focus</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Focus on reducing FOMO-driven trades</p>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-medium text-primary">Suggestion</p>
            <p className="text-sm text-foreground">Wait for confirmation before entering</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "reports-risk-kpis": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Risk KPIs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">1.2%</p>
            <p className="text-xs text-muted-foreground">Avg Risk</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">2.5%</p>
            <p className="text-xs text-muted-foreground">Max Risk</p>
          </div>
          <div>
            <p className="text-lg font-bold text-destructive">-£850</p>
            <p className="text-xs text-muted-foreground">Max Loss</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "reports-risk-distribution": ({ slotType }) => {
    const chartHeight = slotType === "hero" ? "h-64" : "h-40";

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={chartHeight + " flex items-center justify-center"}>
            <div className="grid grid-cols-4 gap-2 w-full">
              {["0-1%", "1-2%", "2-3%", "3%+"].map((range, i) => (
                <div key={range} className="text-center">
                  <div className="w-full bg-primary/20 rounded-t" style={{ height: `${[45, 85, 35, 15][i]}px` }} />
                  <p className="text-xs text-muted-foreground mt-1">{range}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },

  "reports-risk-discipline": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Risk Discipline Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="35" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="hsl(var(--success))"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${85 * 2.2} ${220 - 85 * 2.2}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">85%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Excellent discipline</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "reports-performance-by-day": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Win Rate by Day</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
            <div key={day} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8">{day}</span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${[72, 65, 58, 70, 68][i]}%` }} />
              </div>
              <span className="text-xs text-foreground w-10">{[72, 65, 58, 70, 68][i]}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "reports-performance-by-session": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Win Rate by Session</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "London", rate: 71, color: "#F4D35E" },
            { name: "New York", rate: 65, color: "#F77F00" },
            { name: "Asian", rate: 58, color: "#4361EE" },
            { name: "Sydney", rate: 52, color: "#2EC4B6" },
          ].map((session) => (
            <div
              key={session.name}
              className="p-2 rounded-lg bg-muted/50 border-l-2"
              style={{ borderColor: session.color }}
            >
              <p className="text-xs text-muted-foreground">{session.name}</p>
              <p className="text-lg font-bold text-foreground">{session.rate}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "reports-performance-distribution": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Trade Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <p className="text-lg font-bold text-foreground mt-2">62%</p>
            <p className="text-xs text-muted-foreground">Long</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-lg font-bold text-foreground mt-2">38%</p>
            <p className="text-xs text-muted-foreground">Short</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  "alerts-my-alerts-timers": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">My Alerts &amp; Timers</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { type: "Price Alert", what: "EURUSD > 1.0850", status: "active" },
            { type: "News Alert", what: "USD High Impact", status: "pending" },
            { type: "Session Timer", what: "London Open", status: "active" },
          ].map((alert, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">{alert.type}</p>
                  <p className="text-xs text-muted-foreground">{alert.what}</p>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  alert.status === "active" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {alert.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "alerts-price-alerts": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Active Price Alerts</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-foreground">EUR/USD above 1.0850</span>
            </div>
            <span className="text-xs text-muted-foreground">Touch</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm text-foreground">Gold below 2020.00</span>
            </div>
            <span className="text-xs text-muted-foreground">Close 1H</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">2 active alerts</p>
      </CardContent>
    </Card>
  ),

  "alerts-summary": () => <AlertsSummaryDashboardCard />,

  "quick-calculator": () => <QuickRiskCalculator compact />,

  "position-size-calculator": () => <PositionSizeCalculator compact />,

  "rr-calculator": () => <RiskRewardCalculator compact />,

  "daily-risk-limit": () => <DailyRiskLimitTracker compact />,

  "max-drawdown-guard": () => <MaxDrawdownGuard compact />,

  "top-news": () => <TopNewsDashboardCard />,

  "session-timers": () => <SessionTimersDashboardCard />,

  "upcoming-events": () => <UpcomingEventsDashboardCard />,

  "calendar-events": () => <CalendarEventsDashboardCard />,

  "reports-overview": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Reports Overview</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Key trading metrics at a glance (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-performance": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Performance Analysis</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Win rate and session breakdowns (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-sessions": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Sessions Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Performance by trading session (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-assets": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Assets Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Performance by instrument (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-setup-quality": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Setup Quality Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Performance by setup rating (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-psychology": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Psychology Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Emotional trading analysis (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-risk": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Risk Management Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Risk metrics and analysis (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "journal-summary": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Journal Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Recent journal entries overview (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "daily-performance": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Daily Performance</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Current week trading calendar preview (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),
};

export const getCardRenderer = (cardId: string): ((ctx: CardRenderContext) => React.ReactNode) | undefined => {
  return CARD_RENDERERS[cardId];
};

export const hasCardRenderer = (cardId: string): boolean => {
  return cardId in CARD_RENDERERS;
};

export const warnMissingRenderers = (registryCardIds: string[]): void => {
  const missing = registryCardIds.filter((id) => !hasCardRenderer(id));

  if (missing.length > 0) {
    console.warn(
      "[Dashboard] The following registered cards have no render function:\n" +
        missing.map((id) => `  - ${id}`).join("\n") +
        "\nAdd render functions to src/data/dashboardCardRenderers.tsx",
    );
  }
};
