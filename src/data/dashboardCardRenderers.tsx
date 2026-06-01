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

import { useWatchlist, useAssets } from "@/hooks/use-watchlist";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { normalizeSymbol } from "@/services/marketData";
import { buildMarketContext, type MarketContext } from "@/services/contextEngine";
import { useTraderStyle } from "@/context/TraderStyleProvider";

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
  const quotes = useMarketQuotes(symbols);

  const [contexts, setContexts] = useState<MarketContext[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      basisAssets.map((asset) =>
        buildMarketContext({
          asset,
          quote: quotes[normalizeSymbol(asset.symbol)],
          upcomingRelevantEvents: [],
          traderStyle,
        }),
      ),
    )
      .then((result) => {
        if (!cancelled) setContexts(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [basisAssets, traderStyle]); // quotes intentionally omitted — new ref every render would cause infinite loop

  const bullishCount = contexts.filter((ctx) => ctx.biasState.includes("Bullish")).length;
  const bearishCount = contexts.filter((ctx) => ctx.biasState.includes("Bearish")).length;
  const weakeningCount = contexts.filter((ctx) => ctx.biasState.includes("Weakening")).length;

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
   CARD RENDERERS
======================= */

export const CARD_RENDERERS: Record<string, (ctx: CardRenderContext) => React.ReactNode> = {
  "todays-bias": () => <TodaysBiasDashboardCard />,

  "active-trades": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Active Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">3</p>
        <p className="text-xs text-muted-foreground mt-1">Directional exposure overview</p>
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
        <p className="text-xs text-muted-foreground mt-1">Click session for details</p>
      </CardContent>
    </Card>
  ),

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
        <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate Estimate</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">66.7%</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-expectancy": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Expectancy</CardTitle>
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
          <CardTitle className="text-sm font-medium text-muted-foreground">Lowest Realised P&L Day</CardTitle>
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
                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Cumulative P&L"]}
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
        <p className="text-sm text-muted-foreground">Win Rate and session breakdowns.</p>
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
