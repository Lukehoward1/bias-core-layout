import { useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Star, TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Clock, Target, Zap } from "lucide-react";

import { useWatchlist, useAssets } from "@/hooks/use-watchlist";
import { useMarketQuote } from "@/hooks/use-market-quotes";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { calendarEvents, sortCalendarEventsByImpact, type CalendarEvent } from "@/data/calendarEvents";
import { toast } from "sonner";

import { getEventImpact } from "@/data/eventImpactRules";
import { getFormattedMarketChange } from "@/services/marketData";

/* =======================
   DATA (demo placeholders)
======================= */

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

const quickInsights: Record<string, string[]> = {
  XAUUSD: [
    "Bias: Bullish → approaching resistance at 2035",
    "Level: Price near D1 support 2018–2022",
    "Trend: H4 structure remains bullish",
    "Volatility: High-impact USD news in 2 hours",
  ],
  EURUSD: [
    "Bias: Bullish → testing 1.0850 resistance",
    "Level: Price above D1 support 1.0820",
    "Trend: H4 bullish momentum increasing",
    "Volatility: CPI data expected today",
  ],
  BTCUSD: [
    "Bias: Bullish → ETF decision pending",
    "Level: Price consolidating near 37,000",
    "Trend: Weekly structure bullish",
    "Volatility: High due to regulatory news",
  ],
};

const keyLevels = [
  { type: "Daily Support", price: "2018.5", notes: "Retest zone" },
  { type: "Daily Resistance", price: "2035.0", notes: "Liquidity overhead" },
  { type: "Weekly Support", price: "2000.0", notes: "Major level" },
  { type: "Trendline", price: "—", notes: "Uptrend intact" },
];

const upcomingNews = [
  { time: "13:30", event: "USD CPI m/m", impact: "High", forecast: "0.3%", previous: "0.2%", actual: "—" },
  { time: "15:00", event: "USD Core CPI y/y", impact: "High", forecast: "3.8%", previous: "3.9%", actual: "—" },
  {
    time: "15:30",
    event: "USD Unemployment Claims",
    impact: "Medium",
    forecast: "220K",
    previous: "218K",
    actual: "—",
  },
];

const sessionInsights = [
  { session: "London Open", volatility: "High", description: "Strong directional moves expected" },
  { session: "New York Open", volatility: "Medium", description: "Continuation or reversal likely" },
  { session: "Asia", volatility: "Low", description: "Consolidation phase typical" },
];

/* =======================
   HELPERS
======================= */

type NewsPill = {
  key: string;
  event: string;
  time: string;
  impact: "High" | "Medium" | "Low";
  calendarEvent?: CalendarEvent;
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

const sortRelevantEvents = (events: CalendarEvent[]) => {
  return sortCalendarEventsByImpact(events).sort((a, b) => {
    if (a.impact !== b.impact) return 0;
    return a.time.localeCompare(b.time);
  });
};

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

/* =======================
   REUSABLE CONTENT
======================= */

export function AssetDetailContent({ symbol, onRequestClose }: { symbol: string; onRequestClose?: () => void }) {
  const { getAssetBySymbol } = useAssets();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const asset = symbol ? getAssetBySymbol(symbol) : undefined;
  const isWatchlisted = symbol ? isInWatchlist(symbol) : false;

  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const [showAllRelevantNews, setShowAllRelevantNews] = useState(false);
  const [newsExpanded, setNewsExpanded] = useState(false);

  const quote = useMarketQuote(symbol);

  const handleToggleWatchlist = () => {
    toggleWatchlist(symbol);
  };

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
    return sortRelevantEvents(calendarEvents.filter((event) => isEventRelevantToSymbol(symbol, event)));
  }, [symbol]);

  const newsImpactPills: NewsPill[] = useMemo(() => {
    if (!symbol) return [];

    const fromCalendar: NewsPill[] = relevantCalendarEvents.map((event) => ({
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

    if (!showAllRelevantNews && filtered.length === 0 && combined.length > 0) {
      return combined;
    }

    return filtered;
  }, [symbol, relevantCalendarEvents, showAllRelevantNews]);

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

  const insights = useMemo(() => {
    if (!symbol || !asset) return [];
    return (
      quickInsights[symbol] || [
        `Bias: ${asset.biasDirection} → monitoring key levels`,
        "Level: Price near significant support/resistance",
        "Trend: Structure developing on H4",
        "Volatility: Watch for upcoming news events",
      ]
    );
  }, [symbol, asset]);

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
          <Button variant="outline" size="sm" onClick={onRequestClose}>
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
                  <Button variant="ghost" size="icon" onClick={handleToggleWatchlist} className="h-10 w-10">
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
                    Quick Insights
                  </h3>
                  <div className="space-y-2">
                    {insights.map((insight, index) => {
                      const colors = ["bg-primary", "bg-success", "bg-warning", "bg-destructive"];
                      return (
                        <div key={index} className="flex items-start gap-2">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${colors[index % colors.length]} mt-1.5 flex-shrink-0`}
                          />
                          <p className="text-sm text-muted-foreground">{insight}</p>
                        </div>
                      );
                    })}
                  </div>

                  {newsImpactPills.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          News Impact
                        </h3>

                        <button
                          type="button"
                          onClick={() => setShowAllRelevantNews((v) => !v)}
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
                              onPointerDown={(e) => {
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
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{asset.symbol}</strong> is currently showing a{" "}
                <strong className={getBiasColor(asset.biasDirection)}>{asset.biasDirection.toLowerCase()}</strong> bias
                with {asset.biasConfidence}% confidence based on our multi-timeframe analysis.
              </p>

              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    <strong>Warning:</strong> High-impact news events scheduled within the next 4 hours.
                  </p>
                </div>
              </div>
            </div>
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
                {keyLevels.map((level, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-foreground">{level.type}</span>
                      <p className="text-xs text-muted-foreground">{level.notes}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{level.price}</span>
                  </div>
                ))}
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
                {sessionInsights.map((session, index) => (
                  <div key={index} className="p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{session.session}</span>
                      <Badge
                        variant={
                          session.volatility === "High"
                            ? "destructive"
                            : session.volatility === "Medium"
                              ? "default"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {session.volatility}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{session.description}</p>
                  </div>
                ))}
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
                {upcomingNews.map((news, index) => (
                  <button
                    key={index}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      const matched = relevantCalendarEvents.find((event) => {
                        const sameTime = event.time === news.time;
                        const sameImpact = toPillImpact(event.impact) === news.impact;
                        const titleA = event.event.toLowerCase();
                        const titleB = news.event.toLowerCase();
                        return (
                          sameTime &&
                          (titleA === titleB || titleA.includes(titleB) || titleB.includes(titleA) || sameImpact)
                        );
                      });

                      if (!matched) {
                        toast.error("No matching calendar event found for this news item yet.");
                        return;
                      }

                      openCalendarEvent(matched);
                    }}
                    className="w-full text-left p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{news.time}</span>
                      <Badge variant={news.impact === "High" ? "destructive" : "default"} className="text-[10px]">
                        {news.impact}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">{news.event}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>F: {news.forecast}</span>
                      <span>P: {news.previous}</span>
                      <span>A: {news.actual}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EventDetailsModal
        event={selectedCalendarEvent as any}
        isOpen={isEventModalOpen}
        onClose={closeCalendarOverlay}
      />
    </>
  );
}

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  if (!symbol) return null;
  return <AssetDetailContent symbol={symbol} />;
}
