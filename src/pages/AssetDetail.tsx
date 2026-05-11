// src/pages/AssetDetail.tsx
import { useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Star, TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Clock, Target, Zap, X } from "lucide-react";

import { useWatchlist, useAssets } from "@/hooks/use-watchlist";
import { useMarketQuote } from "@/hooks/use-market-quotes";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { toast } from "sonner";

import { getEventImpact } from "@/data/eventImpactRules";
import { getFormattedMarketChange } from "@/services/marketData";
import type { CalendarEvent } from "@/data/calendarEvents";
import { getAllCalendarEvents, getEventDateTime, formatCalendarEventDateLabel } from "@/services/calendarData";
import { buildMarketContext, type KeyLevel, type SessionContextItem } from "@/services/contextEngine";
import { useTraderStyle } from "@/context/TraderStyleProvider";

const assetNewsEvents: Record<string, { event: string; time: string; impact: "High" | "Medium" | "Low" }[]> = {
  EURUSD: [
    { event: "CPI (USD)", time: "13:30 GMT", impact: "High" },
    { event: "Core CPI (USD)", time: "15:00 GMT", impact: "High" },
  ],
  GBPUSD: [
    { event: "Retail Sales (GBP)", time: "14:00 GMT", impact: "Medium" },
    { event: "CPI (USD)", time: "13:30 GMT", impact: "High" },
  ],
  USDJPY: [],
  XAUUSD: [
    { event: "CPI (USD)", time: "13:30 GMT", impact: "High" },
    { event: "Gold Futures Report", time: "15:30 GMT", impact: "Medium" },
  ],
  BTCUSD: [{ event: "BTC ETF Decision", time: "12:00 GMT", impact: "High" }],
  AUDUSD: [],
  USDCAD: [
    { event: "CAD Inflation", time: "16:00 GMT", impact: "High" },
    { event: "CPI (USD)", time: "13:30 GMT", impact: "High" },
  ],
  SPX500: [
    { event: "US Market Open", time: "14:30 GMT", impact: "Low" },
    { event: "CPI (USD)", time: "13:30 GMT", impact: "High" },
  ],
  ETHUSD: [{ event: "ETH Network Update", time: "18:00 GMT", impact: "Medium" }],
};

type NewsPill = {
  key: string;
  event: string;
  time: string;
  impact: "High" | "Medium" | "Low";
  calendarEvent?: CalendarEvent;
};

type ContextSnapshotItem = {
  label: string;
  text: string;
  accent: "success" | "warning" | "destructive" | "primary" | "muted";
};

const normalizeMarketSymbol = (symbol: string) => symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
const isFxPairSymbol = (symbol: string) => /^[A-Z]{6}$/.test(symbol);

const getFxCurrencies = (symbol: string) => {
  const normalized = normalizeMarketSymbol(symbol);
  if (!isFxPairSymbol(normalized)) return [];
  return [normalized.slice(0, 3), normalized.slice(3, 6)];
};

const toPillImpact = (impact: CalendarEvent["impact"]): "High" | "Medium" | "Low" => {
  if (impact === "high") return "High";
  if (impact === "medium") return "Medium";
  return "Low";
};

const parseNewsTimeToHHMM = (timeStr: string) => {
  const match = timeStr.match(/(\d{1,2}:\d{2})/);
  if (!match) return null;
  const [hh, mm] = match[1].split(":");
  return `${hh.padStart(2, "0")}:${mm}`;
};

const formatPriceNoCommas = (raw: string | number) => {
  const cleaned = (raw ?? "").toString().trim();
  if (!cleaned || cleaned === "—") return "—";

  const noCommas = cleaned.replace(/,/g, "");
  const n = Number(noCommas);
  if (!Number.isFinite(n)) return noCommas;

  const m = noCommas.match(/^\d+(\.(\d+))?$/);
  if (m) {
    const decimals = m[2]?.length ?? 0;
    if (decimals > 0) return n.toFixed(decimals);
  }

  return String(n);
};

function formatBiasModeLabel(mode?: string) {
  const m = (mode || "").toLowerCase().trim();
  if (m === "scalper" || m === "scalping") return "Scalper";
  if (m === "swing") return "Swing";
  return "Intraday";
}

function sortEventsByImpactThenTime(events: CalendarEvent[]) {
  const impactValue = (impact: CalendarEvent["impact"]) => {
    if (impact === "high") return 3;
    if (impact === "medium") return 2;
    return 1;
  };

  return [...events].sort((a, b) => {
    const impactDiff = impactValue(b.impact) - impactValue(a.impact);
    if (impactDiff !== 0) return impactDiff;
    return getEventDateTime(a).getTime() - getEventDateTime(b).getTime();
  });
}

const isEventRelevantToSymbol = (symbol: string, event: CalendarEvent) => {
  const normalizedSymbol = normalizeMarketSymbol(symbol);
  const impact = getEventImpact({
    title: event.event,
    currency: event.currency,
  });

  if (impact.affectedPairs.includes(normalizedSymbol)) return true;
  if (impact.affectedAssets.includes(normalizedSymbol)) return true;

  if (isFxPairSymbol(normalizedSymbol)) {
    const pairCurrencies = getFxCurrencies(normalizedSymbol);
    return pairCurrencies.some((currency) => impact.affectedCurrencies.includes(currency));
  }

  return false;
};

const formatTimeUntil = (date: Date) => {
  if (Number.isNaN(date.getTime())) return null;

  const now = Date.now();
  const diffMs = date.getTime() - now;

  if (diffMs <= 0) return "due now";

  const diffMins = Math.ceil(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (diffHours <= 0) return `in ${diffMins}m`;
  if (diffHours < 24) return `in ${diffHours}h ${mins}m`;

  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;
  return `in ${diffDays}d ${remHours}h`;
};

const getAccentClass = (accent: ContextSnapshotItem["accent"]) => {
  switch (accent) {
    case "success":
      return "border-success";
    case "warning":
      return "border-warning";
    case "destructive":
      return "border-destructive";
    case "primary":
      return "border-primary";
    default:
      return "border-muted-foreground/30";
  }
};

const getDirectionalWord = (bias: string) => {
  if (bias === "Bullish") return "upside";
  if (bias === "Bearish") return "downside";
  return "neutral";
};

export function AssetDetailContent({ symbol, onRequestClose }: { symbol: string; onRequestClose?: () => void }) {
  const location = useLocation();
  const { getAssetBySymbol } = useAssets();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { traderStyle } = useTraderStyle();

  const asset = symbol ? getAssetBySymbol(symbol) : undefined;
  const isWatchlisted = symbol ? isInWatchlist(symbol) : false;

  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [showAllRelevantNews, setShowAllRelevantNews] = useState(false);
  const [newsExpanded, setNewsExpanded] = useState(false);

  const quote = useMarketQuote(symbol);

  const allCalendarEvents = useMemo(() => getAllCalendarEvents(), []);
  const openedFromAlert = Boolean((location.state as { openedFromAlert?: boolean } | null)?.openedFromAlert);

  const openCalendarEvent = useCallback((event: CalendarEvent) => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);

    requestAnimationFrame(() => {
      setSelectedCalendarEvent(event);
      setIsEventModalOpen(true);
    });
  }, []);

  const closeCalendarOverlay = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
  }, []);

  const relevantCalendarEvents = useMemo(() => {
    if (!symbol) return [];
    return sortEventsByImpactThenTime(allCalendarEvents.filter((event) => isEventRelevantToSymbol(symbol, event)));
  }, [symbol, allCalendarEvents]);

  const upcomingRelevantCalendarEvents = useMemo(() => {
    const now = Date.now();

    return relevantCalendarEvents
      .filter((event) => {
        const time = getEventDateTime(event).getTime();
        return !Number.isNaN(time) && time >= now;
      })
      .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());
  }, [relevantCalendarEvents]);

  const nextHighImpactEvent = useMemo(() => {
    return upcomingRelevantCalendarEvents.find((event) => event.impact === "high") ?? null;
  }, [upcomingRelevantCalendarEvents]);

  const highImpactEventsNext4Hours = useMemo(() => {
    const now = Date.now();
    const fourHoursFromNow = now + 4 * 60 * 60 * 1000;

    return upcomingRelevantCalendarEvents.filter((event) => {
      if (event.impact !== "high") return false;
      const time = getEventDateTime(event).getTime();
      return !Number.isNaN(time) && time >= now && time <= fourHoursFromNow;
    });
  }, [upcomingRelevantCalendarEvents]);

  const newsImpactPills: NewsPill[] = useMemo(() => {
    if (!symbol) return [];

    const fromCalendar: NewsPill[] = upcomingRelevantCalendarEvents.map((event) => ({
      key: `cal-${event.id}`,
      event: event.event,
      time: `${event.time} GMT`,
      impact: toPillImpact(event.impact),
      calendarEvent: event,
    }));

    const calendarKeys = new Set(
      fromCalendar.map((item) => `${item.event.toLowerCase()}|${parseNewsTimeToHHMM(item.time) || item.time}`),
    );

    const extrasRaw = assetNewsEvents[symbol] || [];
    const extras: NewsPill[] = extrasRaw
      .filter((item) => {
        const timeKey = parseNewsTimeToHHMM(item.time) || item.time;
        const key = `${item.event.toLowerCase()}|${timeKey}`;
        return !calendarKeys.has(key);
      })
      .map((item, index) => ({
        key: `extra-${symbol}-${index}-${item.event}`,
        event: item.event,
        time: item.time,
        impact: item.impact,
      }));

    const combined = [...fromCalendar, ...extras];
    const filtered = showAllRelevantNews ? combined : combined.filter((item) => item.impact === "High");

    if (!showAllRelevantNews && filtered.length === 0 && combined.length > 0) return combined;

    return filtered;
  }, [symbol, upcomingRelevantCalendarEvents, showAllRelevantNews]);

  const upcomingNewsItems = useMemo(() => {
    return upcomingRelevantCalendarEvents.slice(0, 3);
  }, [upcomingRelevantCalendarEvents]);

  const openCalendarOverlayFromNewsPill = useCallback(
    (pill: NewsPill) => {
      if (pill.calendarEvent) {
        openCalendarEvent(pill.calendarEvent);
        return;
      }

      const pillTime = parseNewsTimeToHHMM(pill.time);
      const matched = relevantCalendarEvents.find((event) => {
        const sameName = event.event.toLowerCase() === pill.event.toLowerCase();
        const sameTime = pillTime ? event.time === pillTime : true;
        return sameName && sameTime;
      });

      if (matched) {
        openCalendarEvent(matched);
        return;
      }

      toast.error("No matching calendar event found for this news item yet.");
    },
    [openCalendarEvent, relevantCalendarEvents],
  );

  const marketContext = useMemo(() => {
    if (!asset) return null;
    return buildMarketContext({
      asset,
      quote,
      upcomingRelevantEvents: upcomingRelevantCalendarEvents,
      traderStyle,
    });
  }, [asset, quote, upcomingRelevantCalendarEvents, traderStyle]);

  const contextSnapshot = useMemo<ContextSnapshotItem[]>(() => {
    if (!asset || !marketContext) return [];

    const biasTf = marketContext.timeframes.bias[0] ?? "Higher timeframe";
    const structureTf = marketContext.timeframes.structure[0] ?? "Structure timeframe";
    const direction = getDirectionalWord(asset.biasDirection);

    const nearestPullback =
      marketContext.levels.find((level) =>
        asset.biasDirection === "Bullish"
          ? level.type.toLowerCase().includes("low") || level.reason.toLowerCase().includes("demand")
          : level.type.toLowerCase().includes("high") || level.reason.toLowerCase().includes("supply"),
      ) ?? marketContext.levels[0];

    const nearbyTarget =
      marketContext.levels.find((level) => level.type.toLowerCase().includes("target")) ??
      marketContext.levels.find((level) => level.tags.some((tag) => tag.toLowerCase().includes("nearby"))) ??
      marketContext.levels[1];

    const liquidityLevel =
      marketContext.levels.find((level) => level.type.toLowerCase().includes("liquidity")) ??
      marketContext.levels.find((level) => level.tags.some((tag) => tag.toLowerCase().includes("liquidity")));

    const isWeakening = marketContext.biasState.toLowerCase().includes("weakening");
    const isFailure = marketContext.biasState.toLowerCase().includes("failure");
    const isNeutral = marketContext.biasState.toLowerCase().includes("neutral");

    return [
      {
        label: "Higher timeframe bias",
        text: isNeutral
          ? `${biasTf} context remains neutral; directional conviction is limited.`
          : `${biasTf} structure remains ${asset.biasDirection.toLowerCase()}; ${direction} bias is intact.`,
        accent:
          asset.biasDirection === "Bullish" ? "success" : asset.biasDirection === "Bearish" ? "destructive" : "muted",
      },
      {
        label: "Current market condition",
        text: `${structureTf} ${marketContext.structureState.toLowerCase()}; current structure is being monitored for continuation or failure.`,
        accent: "primary",
      },
      {
        label: "Active risk",
        text: isFailure
          ? "Prior bias has shown failure characteristics; confirmation is needed before respecting the opposite side."
          : isWeakening
            ? "Short-term continuation risk is elevated; current bias is losing momentum."
            : "No elevated short-term risk flags at current price.",
        accent: isFailure ? "destructive" : isWeakening ? "warning" : "muted",
      },
      {
        label: "Invalidation level",
        text: nearestPullback
          ? `${asset.biasDirection} continuation weakens around ${nearestPullback.price}.`
          : "No clear invalidation level available from current context.",
        accent: "destructive",
      },
      {
        label: "Next relevant areas",
        text:
          [
            liquidityLevel ? `Liquidity: ${liquidityLevel.price}` : null,
            nearbyTarget ? `Nearby target: ${nearbyTarget.price}` : null,
          ]
            .filter(Boolean)
            .join(" • ") || "No clear nearby reaction areas available.",
        accent: "muted",
      },
    ];
  }, [asset, marketContext]);

  const getBiasColor = (bias: string) => {
    if (bias === "Bullish") return "text-success";
    if (bias === "Bearish") return "text-destructive";
    return "text-muted-foreground";
  };

  const getBiasIcon = (bias: string) => {
    if (bias === "Bullish") return <TrendingUp className="h-6 w-6" />;
    if (bias === "Bearish") return <TrendingDown className="h-6 w-6" />;
    return <Minus className="h-6 w-6" />;
  };

  const getChangeColor = () => {
    if (quote) {
      const formatted = getFormattedMarketChange(quote);
      if (formatted.direction === "up") return "text-success";
      if (formatted.direction === "down") return "text-destructive";
      return "text-muted-foreground";
    }

    if (asset?.priceChange?.startsWith("+")) return "text-success";
    if (asset?.priceChange?.startsWith("-")) return "text-destructive";
    return "text-muted-foreground";
  };

  const getDisplayedChange = () => {
    if (quote) return getFormattedMarketChange(quote).value;
    return asset?.priceChange || "0.00%";
  };

  if (!asset) {
    return (
      <div className="text-center py-10 px-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Asset not found</h1>
        <Button onClick={() => onRequestClose?.()}>Close</Button>
      </div>
    );
  }

  const modeLabel = formatBiasModeLabel((asset as any).biasMode);
  const tfs = Array.isArray((asset as any).biasTimeframes) ? ((asset as any).biasTimeframes as string[]) : [];
  const tfLabel = tfs.length ? tfs.join(" / ") : "—";
  const displayPrice = formatPriceNoCommas(quote?.last?.toString() ?? asset.latestPrice);

  return (
    <>
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{asset.symbol}</h2>
          <Badge variant="outline" className="text-xs">
            Live Data
          </Badge>
        </div>

        {onRequestClose && (
          <Button variant="outline" size="sm" onClick={onRequestClose} className="gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
        )}
      </div>

      <div className="p-6 space-y-6">
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-4xl font-bold text-foreground">{asset.symbol}</h1>

                  <Button variant="ghost" size="icon" onClick={() => toggleWatchlist(symbol)} className="h-10 w-10">
                    <Star
                      className={`h-6 w-6 ${
                        isWatchlisted ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                </div>

                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-3xl font-semibold text-foreground">{displayPrice}</span>
                  <span className={`text-lg font-medium ${getChangeColor()}`}>{getDisplayedChange()}</span>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Market Context Snapshot
                  </h3>

                  <div className="space-y-3">
                    {contextSnapshot.map((item) => (
                      <div key={item.label} className={`border-l ${getAccentClass(item.accent)} pl-3`}>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 leading-none mb-1">
                          {item.label}
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug">{item.text}</p>
                      </div>
                    ))}
                  </div>

                  {newsImpactPills.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          News Impact
                        </h3>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAllRelevantNews((v) => !v);
                            setNewsExpanded(false);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          {showAllRelevantNews ? "Show high impact only" : "Show all relevant"}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(newsExpanded ? newsImpactPills : newsImpactPills.slice(0, 3)).map((pill) => {
                          const impactColors = {
                            High: "bg-destructive text-destructive-foreground",
                            Medium: "bg-warning text-warning-foreground",
                            Low: "bg-success text-success-foreground",
                          } as const;

                          return (
                            <button
                              key={pill.key}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openCalendarOverlayFromNewsPill(pill);
                              }}
                              className="w-full flex items-center gap-2 text-left hover:bg-muted/30 rounded-md px-2 py-1.5 transition-colors group"
                            >
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${impactColors[pill.impact]}`}
                              >
                                {pill.impact}
                              </span>
                              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                                {pill.event}
                              </span>
                              <span className="text-sm text-muted-foreground">—</span>
                              <span className="text-sm text-muted-foreground">{pill.time}</span>
                            </button>
                          );
                        })}
                      </div>

                      {newsImpactPills.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setNewsExpanded((v) => !v)}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          {newsExpanded ? "Show less" : `+${newsImpactPills.length - 3} more · Show more`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Volume</span>
                    <span className="text-sm font-semibold text-foreground">{asset.volume}</span>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Spread</span>
                    <span className="text-sm font-semibold text-foreground">{asset.spread}</span>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Confidence</span>
                    <span className="text-sm font-semibold text-foreground">{asset.biasConfidence}%</span>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Sentiment</span>
                    <span
                      className={`text-sm font-semibold ${
                        asset.sentiment > 0
                          ? "text-success"
                          : asset.sentiment < 0
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      {asset.sentiment > 0 ? "+" : ""}
                      {asset.sentiment}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center pt-2">
                  <span className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Current Bias</span>

                  <div className="text-xs text-muted-foreground mb-4">
                    Mode: <span className="font-medium text-foreground">{modeLabel}</span> • Timeframes:{" "}
                    <span className="font-medium text-foreground">{tfLabel}</span>
                  </div>

                  <div className="relative w-72 h-36">
                    <svg viewBox="0 0 100 50" className="w-full h-full">
                      <path
                        d="M 10 45 A 40 40 0 0 1 90 45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted"
                      />
                      <path
                        d="M 10 45 A 40 40 0 0 1 90 45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${(asset.biasConfidence / 100) * 126} 126`}
                        className={getBiasColor(asset.biasDirection)}
                      />
                      <line
                        x1="50"
                        y1="45"
                        x2={50 + 35 * Math.cos((Math.PI * (180 - asset.biasConfidence * 1.8)) / 180)}
                        y2={45 - 35 * Math.sin((Math.PI * (180 - asset.biasConfidence * 1.8)) / 180)}
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-foreground"
                      />
                      <circle cx="50" cy="45" r="5" fill="currentColor" className="text-foreground" />
                    </svg>
                  </div>

                  <div className={`flex items-center gap-2 mt-6 ${getBiasColor(asset.biasDirection)}`}>
                    {getBiasIcon(asset.biasDirection)}
                    <span className="text-3xl font-bold">{asset.biasDirection}</span>
                  </div>
                </div>
              </div>
            </div>

            {marketContext && marketContext.timeframeContext.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border/60">
                <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-[0.18em] mb-4">
                  Timeframe Context
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {marketContext.timeframeContext.map((tf) => {
                    const dotClass =
                      tf.state === "bullish"
                        ? "bg-success"
                        : tf.state === "bearish"
                          ? "bg-destructive"
                          : tf.state === "weakening"
                            ? "bg-warning"
                            : tf.state === "liquidity"
                              ? "bg-primary"
                              : "bg-muted-foreground/40";
                    return (
                      <div
                        key={tf.timeframe}
                        className="flex items-center gap-2.5 min-w-0"
                        title={tf.detail}
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} />
                        <span className="text-xs font-mono text-muted-foreground shrink-0 w-8">
                          {tf.timeframe}
                        </span>
                        <span className="text-sm text-foreground truncate">{tf.label}</span>
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  const allTfs = ["1m", "5m", "15m", "30m", "1H", "4H", "D", "W"] as const;
                  const styleTfs: Record<string, string[]> = {
                    scalper: ["1m", "5m", "15m"],
                    intraday: ["5m", "15m", "1H"],
                    swing: ["1H", "4H", "D"],
                  };
                  const highlight = new Set(styleTfs[traderStyle] ?? styleTfs.intraday);
                  const ctxMap = new Map(
                    marketContext.timeframeContext.map((t) => [t.timeframe, t]),
                  );
                  // Derive a coarse state for timeframes not in ctxMap, using bias/structure.
                  const dir = asset.biasDirection;
                  const biasState = marketContext.biasState;
                  const structureState = marketContext.structureState;
                  const highImpactSoon = marketContext.highImpactSoon;
                  const isWeakening = biasState.includes("Weakening");
                  const isFailure = biasState === "Failure Detected";
                  const isNeutral = biasState === "Neutral / Ranging";

                  type S = "bullish" | "bearish" | "weakening" | "liquidity" | "neutral";
                  const isHTF = (tf: string) => ["4H", "D", "W"].includes(tf);
                  const isLTF = (tf: string) => ["1m", "5m", "15m", "30m"].includes(tf);

                  const deriveState = (tf: string): { state: S; label: string } => {
                    const existing = ctxMap.get(tf);
                    if (existing) return { state: existing.state as S, label: existing.label };
                    if (isNeutral) return { state: "neutral", label: "Neutral / choppy" };
                    if (isFailure) return { state: "bearish", label: "Structure broken" };
                    if (isHTF(tf)) {
                      if (dir === "Bullish") return { state: "bullish", label: "HTF bias intact" };
                      if (dir === "Bearish") return { state: "bearish", label: "HTF bias intact" };
                      return { state: "neutral", label: "HTF neutral" };
                    }
                    if (isLTF(tf)) {
                      if (highImpactSoon) return { state: "liquidity", label: "Liquidity area nearby" };
                      if (isWeakening || structureState === "Compressed")
                        return { state: "weakening", label: "Pullback risk elevated" };
                      if (dir === "Bullish") return { state: "bullish", label: "Bullish continuation" };
                      if (dir === "Bearish") return { state: "bearish", label: "Bearish continuation" };
                      return { state: "neutral", label: "Neutral" };
                    }
                    if (isWeakening) return { state: "weakening", label: "Structure weakening" };
                    if (dir === "Bullish") return { state: "bullish", label: "Bullish structure" };
                    if (dir === "Bearish") return { state: "bearish", label: "Bearish structure" };
                    return { state: "neutral", label: "Neutral" };
                  };

                  const dotColor: Record<S, string> = {
                    bullish: "bg-success",
                    bearish: "bg-destructive",
                    weakening: "bg-warning",
                    liquidity: "bg-primary",
                    neutral: "bg-muted-foreground/40",
                  };

                  return (
                    <div className="flex items-end justify-between gap-2 sm:gap-3 pt-1">
                      {allTfs.map((tf) => {
                        const { state, label } = deriveState(tf);
                        const isStyleTf = highlight.has(tf);
                        return (
                          <div
                            key={tf}
                            className="flex flex-col items-center gap-1.5 flex-1 min-w-0"
                            title={`${tf} — ${label}`}
                          >
                            <span
                              className={`text-[11px] font-mono leading-none ${
                                isStyleTf
                                  ? "text-foreground font-semibold"
                                  : "text-muted-foreground/70"
                              }`}
                            >
                              {tf}
                            </span>
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${dotColor[state]} ${
                                isStyleTf
                                  ? "ring-2 ring-offset-1 ring-offset-background ring-foreground/30"
                                  : "opacity-80"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              AI Market Overview
            </CardTitle>
          </CardHeader>

          <CardContent>
            {marketContext && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {marketContext.biasState}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {marketContext.structureState}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Bias TF: {marketContext.timeframes.bias.join(" / ")} • Structure TF:{" "}
                  {marketContext.timeframes.structure.join(" / ")}
                </span>
              </div>
            )}

            <p className="text-muted-foreground leading-relaxed">
              {marketContext?.overview ?? `${asset.symbol} context is being evaluated.`}
            </p>

            {highImpactEventsNext4Hours.length > 0 ? (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />

                  <div className="text-sm text-destructive">
                    <p>
                      <strong>Warning:</strong> {highImpactEventsNext4Hours.length} high-impact news event
                      {highImpactEventsNext4Hours.length > 1 ? "s are" : " is"} scheduled within the next 4 hours.
                    </p>

                    <div className="mt-2 space-y-1">
                      {highImpactEventsNext4Hours.slice(0, 2).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openCalendarEvent(event);
                          }}
                          className="block text-left underline-offset-2 hover:underline"
                        >
                          {event.event} — {formatTimeUntil(getEventDateTime(event))}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : nextHighImpactEvent ? (
              <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />

                  <div className="text-sm text-warning">
                    <p>
                      <strong>Heads up:</strong> Next high-impact event is <strong>{nextHighImpactEvent.event}</strong>{" "}
                      {formatTimeUntil(getEventDateTime(nextHighImpactEvent))}.
                    </p>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openCalendarEvent(nextHighImpactEvent);
                      }}
                      className="mt-2 text-left underline-offset-2 hover:underline"
                    >
                      View event details
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    No relevant high-impact calendar events are currently scheduled.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-primary" />
                Key Levels
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {(marketContext?.levels ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No context-driven levels available.</p>
                ) : (
                  marketContext!.levels.map((level: KeyLevel, index: number) => {
                    const relVariant =
                      level.relevance === "High relevance"
                        ? "destructive"
                        : level.relevance === "Medium relevance"
                          ? "default"
                          : "secondary";

                    return (
                      <div key={index} className="p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{level.type}</span>
                          <span className="text-sm font-semibold text-foreground">{level.price}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          <Badge variant={relVariant} className="text-[10px]">
                            {level.relevance}
                          </Badge>
                          {level.tags.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">{level.reason}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Session Insights
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {(marketContext?.sessionContext ?? []).map((session: SessionContextItem, index: number) => {
                  const variant =
                    session.emphasis === "elevated"
                      ? "destructive"
                      : session.emphasis === "watch"
                        ? "default"
                        : "secondary";

                  return (
                    <div key={index} className="p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-sm font-medium text-foreground">{session.session}</span>
                        <Badge variant={variant} className="text-[10px] capitalize">
                          {session.emphasis}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mb-0.5">{session.headline}</p>
                      <p className="text-xs text-muted-foreground">{session.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Upcoming News
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {upcomingNewsItems.length === 0 ? (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">No relevant upcoming calendar events found.</p>
                  </div>
                ) : (
                  upcomingNewsItems.map((news) => (
                    <button
                      key={news.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openCalendarEvent(news);
                      }}
                      className="w-full text-left p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{formatCalendarEventDateLabel(news)}</span>
                        <Badge
                          variant={
                            news.impact === "high" ? "destructive" : news.impact === "medium" ? "default" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {toPillImpact(news.impact)}
                        </Badge>
                      </div>

                      <p className="text-sm font-medium text-foreground mb-1">{news.event}</p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>F: {news.forecast}</span>
                        <span>P: {news.previous}</span>
                        <span>A: {news.actual}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EventDetailsModal
        event={selectedCalendarEvent}
        isOpen={isEventModalOpen}
        onClose={closeCalendarOverlay}
        openedFromAlert={openedFromAlert}
      />
    </>
  );
}

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const closeOverlay = useCallback(() => {
    const from = (location.state as { from?: string } | null)?.from;

    if (from) {
      navigate(from);
      return;
    }

    navigate("/markets");
  }, [navigate, location.state]);

  if (!symbol) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
      onClick={closeOverlay}
    >
      <div
        className="mx-auto max-w-6xl rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <AssetDetailContent symbol={symbol} onRequestClose={closeOverlay} />
      </div>
    </div>
  );
}
