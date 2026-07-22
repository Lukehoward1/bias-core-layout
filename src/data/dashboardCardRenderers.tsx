import React, { useEffect, useId, useMemo, useState, useCallback } from "react";
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

import { useWatchlist, useAssets } from "@/hooks/use-watchlist";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { useMarketData } from "@/context/MarketDataProvider";
import { useTraderStyle } from "@/context/TraderStyleProvider";
import { useTradingData } from "@/hooks/use-trading-data";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { ACTIVE_ACCOUNT_ALL, useAccountCombineMode } from "@/hooks/use-active-trading-account";
import { useAccountAwareStats } from "@/hooks/use-account-aware-stats";
import { AccountAwareEquityChart } from "@/components/shared/AccountAwareEquityChart";
import { AccountAwareStat } from "@/components/shared/AccountAwareStat";

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

const getUniqueUpcomingEvents = () => {
  const now = Date.now();
  const nextByEventKey = new Map<string, ReturnType<typeof getAllCalendarEvents>[number] & { ts: number }>();

  getAllCalendarEvents()
    .map((event) => {
      const eventDate = getEventDateTime(event);
      return {
        ...event,
        ts: eventDate.getTime(),
      };
    })
    .filter((event) => !Number.isNaN(event.ts) && event.ts >= now)
    .sort((a, b) => a.ts - b.ts)
    .forEach((event) => {
      const key = event.eventKey || `${event.currency}-${event.event}`.toLowerCase().trim();

      if (!nextByEventKey.has(key)) {
        nextByEventKey.set(key, event);
      }
    });

  return Array.from(nextByEventKey.values()).sort((a, b) => {
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

function TodaysBiasDashboardCard() {
  const { assets } = useAssets();
  const { watchlistAssets } = useWatchlist();
  const { traderStyle } = useTraderStyle();

  const basisAssets = useMemo(() => {
    return (watchlistAssets.length > 0 ? watchlistAssets : assets).slice(0, 6);
  }, [watchlistAssets, assets]);

  const symbols = useMemo(() => basisAssets.map((asset) => asset.symbol), [basisAssets]);
  useMarketQuotes(symbols); // subscribe symbols for quote polling used by the provider's context build

  const { contextMap, subscribeContextSymbols } = useMarketData();

  useEffect(() => {
    subscribeContextSymbols(basisAssets, traderStyle);
  }, [basisAssets, traderStyle, subscribeContextSymbols]);

  const bullishCount = basisAssets.filter((a) => contextMap[a.symbol]?.biasState.includes("Bullish")).length;
  const bearishCount = basisAssets.filter((a) => contextMap[a.symbol]?.biasState.includes("Bearish")).length;
  const weakeningCount = basisAssets.filter((a) => contextMap[a.symbol]?.biasState.includes("Weakening")).length;

  const dominantBias =
    bullishCount > bearishCount
      ? "Bullish Conditions"
      : bearishCount > bullishCount
        ? "Bearish Conditions"
        : "Mixed Conditions";

  const dominantColor =
    dominantBias === "Bullish Conditions"
      ? "text-success"
      : dominantBias === "Bearish Conditions"
        ? "text-destructive"
        : "text-muted-foreground";

  const DominantIcon =
    dominantBias === "Bullish Conditions" ? TrendingUp : dominantBias === "Bearish Conditions" ? TrendingDown : Activity;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Bias</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-2xl font-bold ${dominantColor}`}>{dominantBias}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {bullishCount} bullish · {bearishCount} bearish · {weakeningCount} weakening
            </p>
          </div>

          <DominantIcon className={`h-6 w-6 ${dominantColor}`} />
        </div>
      </CardContent>
    </Card>
  );
}

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
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {item.currency} · {item.impact}
                    </p>
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
  const navigate = useNavigate();
  const events = useMemo(() => getUniqueUpcomingEvents().slice(0, 4), []);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/calendar")}
        >
          View all
        </Button>
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
   LIVE KPI HELPERS
======================= */

function currencySymbol(code?: string): string {
  if (code === "USD") return "$";
  if (code === "EUR") return "€";
  if (code === "JPY") return "¥";
  return "£";
}

/* =======================
   LIVE KPI CARDS
======================= */

function ActiveTradesCard() {
  const { viewTrades } = useTradingData();
  const openCount = viewTrades.filter((t) => t.status === "open").length;
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Active Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{openCount}</p>
        <p className="text-xs text-muted-foreground mt-1">open positions</p>
      </CardContent>
    </Card>
  );
}

function NextSessionCard() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { sessionName, label, isLive } = useMemo(() => {
    const sessions = SESSION_CONFIGS.map((c) => buildSessionCard(c, now));
    const live = sessions.find((s) => s.status === "open");
    if (live) return { sessionName: live.name, label: "Live Now", isLive: true };

    let best = sessions[0];
    let bestSec = Infinity;
    for (const s of sessions) {
      const m = s.time.match(/(\d+):(\d+):(\d+)/);
      if (m) {
        const sec = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
        if (sec < bestSec) { bestSec = sec; best = s; }
      }
    }
    const h = Math.floor(bestSec / 3600);
    const mins = Math.floor((bestSec % 3600) / 60);
    const countdownLabel = h > 0 ? `Opens in ${h}h ${mins}m` : `Opens in ${mins}m`;
    return { sessionName: best.name, label: countdownLabel, isLive: false };
  }, [now]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Next Session</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{sessionName}</p>
        <p className={`text-xs mt-1 ${isLive ? "text-success" : "text-muted-foreground"}`}>{label}</p>
      </CardContent>
    </Card>
  );
}

function PerformanceOverviewCard() {
  const { viewTrades, primaryAccount } = useTradingData();
  const sym = currencySymbol(primaryAccount?.currency);

  const { weekPnl, monthPnl } = useMemo(() => {
    const now = Date.now();
    const weekPnl = viewTrades.reduce((s, t) =>
      now - new Date(t.date).getTime() <= 7 * 86_400_000 ? s + (t.pnl ?? 0) : s, 0);
    const monthPnl = viewTrades.reduce((s, t) =>
      now - new Date(t.date).getTime() <= 30 * 86_400_000 ? s + (t.pnl ?? 0) : s, 0);
    return { weekPnl, monthPnl };
  }, [viewTrades]);

  const fmtPnl = (v: number) =>
    v === 0
      ? `${sym}0`
      : `${v > 0 ? "+" : ""}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const pnlColor = (v: number) => v > 0 ? "text-success" : v < 0 ? "text-destructive" : "text-muted-foreground";

  return (
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
            <p className={`text-lg font-bold ${pnlColor(weekPnl)}`}>{fmtPnl(weekPnl)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Monthly</p>
            <p className={`text-lg font-bold ${pnlColor(monthPnl)}`}>{fmtPnl(monthPnl)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskSnapshotCard() {
  const { viewTrades, primaryAccount } = useTradingData();

  const { dailyRisk, openExposurePct, drawdownPct } = useMemo(() => {
    const balance = primaryAccount?.balance ?? 100_000;
    const today = new Date().toLocaleDateString("sv"); // YYYY-MM-DD local

    const todayLosses = viewTrades
      .filter((t) => t.date === today && (t.pnl ?? 0) < 0)
      .reduce((s, t) => s + Math.abs(t.pnl ?? 0), 0);
    const dailyRisk = balance > 0 ? (todayLosses / balance) * 100 : 0;

    const openCount = viewTrades.filter((t) => t.status === "open").length;
    const openExposurePct = viewTrades.length > 0 ? (openCount / viewTrades.length) * 100 : 0;

    const sorted = [...viewTrades].sort((a, b) => a.date.localeCompare(b.date));
    let peak = balance;
    let running = balance;
    for (const t of sorted) {
      running += t.pnl ?? 0;
      if (running > peak) peak = running;
    }
    const drawdownPct = peak > 0 ? Math.max(0, ((peak - running) / peak) * 100) : 0;

    return { dailyRisk, openExposurePct, drawdownPct };
  }, [viewTrades, primaryAccount]);

  const fmtPct = (v: number) => `${v.toFixed(1)}%`;

  return (
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
            <span className={`text-sm font-medium ${dailyRisk === 0 ? "text-muted-foreground" : dailyRisk > 2 ? "text-destructive" : "text-warning"}`}>
              {dailyRisk === 0 ? "0%" : fmtPct(dailyRisk)}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm text-foreground">Open Exposure</span>
            <span className={`text-sm font-medium ${openExposurePct === 0 ? "text-muted-foreground" : "text-foreground"}`}>
              {openExposurePct === 0 ? "0%" : fmtPct(openExposurePct)}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm text-foreground">Drawdown</span>
            <span className={`text-sm font-medium ${drawdownPct === 0 ? "text-success" : drawdownPct > 5 ? "text-destructive" : "text-warning"}`}>
              {drawdownPct === 0 ? "0%" : `-${fmtPct(drawdownPct)}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportsKpiLiveCard({ metric }: { metric: "pnl" | "rr" | "winrate" | "expectancy" }) {
  const { viewTrades, accounts, activeAccountId } = useTradingData();
  const { primaryAccount } = useLinkedAccounts();
  const sym = currencySymbol(primaryAccount?.currency);

  const { perAccount, combined, canCombine } = useAccountAwareStats(viewTrades, accounts);

  type MetricConfig = {
    title: string;
    select: (s: import("@/hooks/use-account-aware-stats").AccountStats) => string | number;
    format: (v: string | number) => string;
    colorClass: (v: string | number) => string;
  };

  const configs: Record<typeof metric, MetricConfig> = {
    pnl: {
      title: "Total P&L",
      select: (s) => s.totalPnl,
      format: (v) => {
        const n = Number(v);
        return `${n >= 0 ? "+" : ""}${sym}${Math.abs(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
      },
      colorClass: (v) => (Number(v) >= 0 ? "text-success" : "text-destructive"),
    },
    rr: {
      title: "Avg R:R",
      select: (s) => s.avgRR,
      format: (v) => Number(v).toFixed(2),
      colorClass: () => "text-foreground",
    },
    winrate: {
      title: "Profit Rate",
      select: (s) => s.winRate,
      format: (v) => `${v}%`,
      colorClass: () => "text-foreground",
    },
    expectancy: {
      title: "Avg Expectancy",
      select: (s) => s.expectancy,
      format: (v) => {
        const n = Number(v);
        return `${sym}${Math.round(n).toLocaleString()}/trade`;
      },
      colorClass: (v) => (Number(v) >= 0 ? "text-success" : "text-destructive"),
    },
  };

  const { title, select, format, colorClass } = configs[metric];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <AccountAwareStat
          perAccount={perAccount}
          combined={combined}
          canCombine={canCombine}
          activeAccountId={activeAccountId}
          select={select}
          format={format}
          colorClass={colorClass}
        />
      </CardContent>
    </Card>
  );
}

function BestWorstDayCard({ type }: { type: "best" | "worst" }) {
  const { viewTrades, accounts, activeAccountId } = useTradingData();
  const { primaryAccount } = useLinkedAccounts();
  const sym = currencySymbol(primaryAccount?.currency);
  const [combineMode] = useAccountCombineMode();
  const isAllAccounts = activeAccountId === ACTIVE_ACCOUNT_ALL;

  const { perAccount, combined, canCombine } = useAccountAwareStats(viewTrades, accounts);

  const isBest = type === "best";
  const cardClass = isBest ? "h-full bg-success/5 border-success/20" : "h-full bg-destructive/5 border-destructive/20";
  const icon = isBest
    ? <TrendingUp className="h-4 w-4 text-success" />
    : <TrendingDown className="h-4 w-4 text-destructive" />;
  const title = isBest ? "Best Winning Day" : "Lowest Realised P&L Day";

  const fmtAmt = (v: number) =>
    `${v >= 0 ? "+" : ""}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // Resolves a { date, pnl } | null from stats for this card's type
  const pickDay = (entry: import("@/hooks/use-account-aware-stats").AccountEntry) =>
    isBest ? entry.stats.bestDay : entry.stats.worstDay;

  // ── Render helpers ──────────────────────────────────────────────────────────

  function SingleDay({ day }: { day: { date: string; pnl: number } | null }) {
    if (!day) return <p className="text-sm text-muted-foreground">No data</p>;
    const cls = isBest ? "text-success" : day.pnl >= 0 ? "text-success" : "text-destructive";
    return (
      <>
        <p className={`text-2xl font-bold ${cls}`}>{fmtAmt(day.pnl)}</p>
        <p className="text-xs text-muted-foreground mt-1">{day.date}</p>
      </>
    );
  }

  function MultiDayRows() {
    const entries = [...perAccount.entries()];
    if (entries.length === 0) return <p className="text-sm text-muted-foreground">No data</p>;
    return (
      <div className="space-y-1.5">
        {entries.map(([accountId, entry], index) => {
          const color = getAccountColor(index);
          const day = pickDay(entry);
          if (!day) {
            return (
              <div key={accountId} className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-muted-foreground truncate">{entry.account.name}</span>
                </div>
                <span className="text-sm text-muted-foreground ml-2">—</span>
              </div>
            );
          }
          const cls = isBest ? "text-success" : day.pnl >= 0 ? "text-success" : "text-destructive";
          return (
            <div key={accountId} className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/50">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{entry.account.name}</p>
                  <p className="text-xs text-muted-foreground">{day.date}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ml-2 flex-shrink-0 ${cls}`}>{fmtAmt(day.pnl)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Resolve content ─────────────────────────────────────────────────────────

  let content: React.ReactNode;
  if (!isAllAccounts) {
    const entry = perAccount.get(activeAccountId);
    content = <SingleDay day={entry ? pickDay(entry) : null} />;
  } else if (combineMode && canCombine && combined) {
    content = <SingleDay day={pickDay(combined)} />;
  } else {
    content = <MultiDayRows />;
  }

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

function LiveEquityCard({ slotType }: { slotType: string }) {
  const { viewTrades, accounts, activeAccountId } = useTradingData();
  const chartHeight = slotType === "hero" ? "h-64" : "h-40";

  const { perAccount, canCombine, combined } = useAccountAwareStats(viewTrades, accounts);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <AccountAwareEquityChart
          perAccount={perAccount}
          combined={combined}
          canCombine={canCombine}
          activeAccountId={activeAccountId}
          chartHeight={chartHeight}
          curveType="absolute"
        />
      </CardContent>
    </Card>
  );
}

/* =======================
   CARD RENDERERS
======================= */

export const CARD_RENDERERS: Record<string, (ctx: CardRenderContext) => React.ReactNode> = {
  "todays-bias": () => <TodaysBiasDashboardCard />,

  "active-trades": () => <ActiveTradesCard />,
  "next-session": () => <NextSessionCard />,

  "high-impact-events": () => <HighImpactEventsDashboardCard />,
  "watchlist-overview": ({ slotType }) => <WatchlistOverviewCard slotType={normalizeWatchlistSlotType(slotType)} />,
  "alerts-summary": () => <AlertsSummaryDashboardCard />,
  "top-news": () => <TopNewsDashboardCard />,
  "session-timers": () => <SessionTimersDashboardCard />,
  "upcoming-events": () => <UpcomingEventsDashboardCard />,
  "calendar-events": () => <CalendarEventsDashboardCard />,

  "quick-calculator": () => <QuickRiskCalculator compact />,
  "position-size-calculator": () => <PositionSizeCalculator compact />,
  "rr-calculator": () => <RiskRewardCalculator compact />,
  "daily-risk-limit": () => <DailyRiskLimitTracker compact />,
  "max-drawdown-guard": () => <MaxDrawdownGuard compact />,

  "performance-overview": () => <PerformanceOverviewCard />,

  "risk-snapshot": () => <RiskSnapshotCard />,

  "pinned-journal-equity": ({ slotType }) => <LiveEquityCard slotType={slotType} />,

  "reports-kpi-total-pnl": () => <ReportsKpiLiveCard metric="pnl" />,
  "reports-kpi-avg-rr": () => <ReportsKpiLiveCard metric="rr" />,
  "reports-kpi-win-rate": () => <ReportsKpiLiveCard metric="winrate" />,
  "reports-kpi-expectancy": () => <ReportsKpiLiveCard metric="expectancy" />,

  "reports-overview-best-day": () => <BestWorstDayCard type="best" />,
  "reports-overview-worst-day": () => <BestWorstDayCard type="worst" />,

  "reports-overview-equity": ({ slotType }) => <LiveEquityCard slotType={slotType} />,
  "reports-overview-rolling30": ({ slotType }) => <LiveEquityCard slotType={slotType} />,

  "alerts-my-alerts-timers": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">My Alerts &amp; Timers</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Active alerts, timers, and scheduled event tracking.</p>
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
        <p className="text-sm text-muted-foreground">Live market level and trigger monitoring.</p>
      </CardContent>
    </Card>
  ),

  "reports-overview": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Reports Overview</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Core account and performance metrics.</p>
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
        <p className="text-sm text-muted-foreground">Profit Rate and session breakdowns.</p>
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
        <p className="text-sm text-muted-foreground">Session-based performance review.</p>
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
        <p className="text-sm text-muted-foreground">Instrument-level performance review.</p>
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
        <p className="text-sm text-muted-foreground">Setup quality and outcome review.</p>
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
        <p className="text-sm text-muted-foreground">Behaviour and discipline review.</p>
      </CardContent>
    </Card>
  ),

  "reports-risk": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Risk Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Exposure, drawdown, and risk consistency.</p>
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
        <p className="text-sm text-muted-foreground">Recent journal entries overview.</p>
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
        <p className="text-sm text-muted-foreground">Current week trading calendar preview.</p>
      </CardContent>
    </Card>
  ),

  "reports-overview-edge": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Edge Statistics</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Edge statistics and expectancy breakdown.</p>
      </CardContent>
    </Card>
  ),

  "reports-performance-by-day": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Performance by Day</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">P&amp;L performance grouped by day of week.</p>
      </CardContent>
    </Card>
  ),

  "reports-performance-by-session": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Performance by Session</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">P&amp;L performance grouped by trading session.</p>
      </CardContent>
    </Card>
  ),

  "reports-performance-distribution": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Performance Distribution</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Win/loss distribution and trade outcome spread.</p>
      </CardContent>
    </Card>
  ),

  "reports-sessions-comparison": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Sessions Comparison</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Side-by-side session performance comparison.</p>
      </CardContent>
    </Card>
  ),

  "reports-sessions-recommendations": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Session Recommendations</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Session-based coaching and focus recommendations.</p>
      </CardContent>
    </Card>
  ),

  "reports-assets-pnl": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Assets P&amp;L</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">P&amp;L breakdown by traded instrument.</p>
      </CardContent>
    </Card>
  ),

  "reports-assets-table": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Assets Table</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Tabulated asset-level statistics and metrics.</p>
      </CardContent>
    </Card>
  ),

  "reports-setup-best-worst": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Best &amp; Worst Setups</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Best and worst performing setup types.</p>
      </CardContent>
    </Card>
  ),

  "reports-setup-patterns": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Setup Patterns</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Recurring setup patterns and outcome analysis.</p>
      </CardContent>
    </Card>
  ),

  "reports-psychology-sentiment": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Sentiment Trends</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Sentiment trends across journal entries.</p>
      </CardContent>
    </Card>
  ),

  "reports-psychology-triggers": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Emotional Triggers</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Emotional triggers and behavioural patterns.</p>
      </CardContent>
    </Card>
  ),

  "reports-psychology-improvement": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Improvement Areas</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Focus areas and improvement recommendations.</p>
      </CardContent>
    </Card>
  ),

  "reports-risk-kpis": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Risk KPIs</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Key risk metrics and exposure summary.</p>
      </CardContent>
    </Card>
  ),

  "reports-risk-distribution": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Risk distribution across trades and sessions.</p>
      </CardContent>
    </Card>
  ),

  "reports-risk-discipline": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Risk Discipline</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Rule adherence and risk discipline scoring.</p>
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
