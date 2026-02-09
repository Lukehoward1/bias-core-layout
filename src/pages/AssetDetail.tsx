import { useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { Star, TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Clock, Target, Zap } from "lucide-react";

import { useWatchlist, useAssets } from "@/hooks/use-watchlist";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { calendarEvents } from "@/data/calendarEvents";
import { toast } from "sonner";

/* =======================
   DATA (demo placeholders)
======================= */

// Asset-specific news events for today (extras / non-calendar items)
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
    { event: "Gold Futures Report", time: "15:30 GMT", impact: "Medium" }, // not in calendarEvents (example)
  ],
  BTCUSD: [{ event: "BTC ETF Decision", time: "12:00 GMT", impact: "High" }], // not in calendarEvents (example)
  AUDUSD: [],
  USDCAD: [
    { event: "CAD Inflation", time: "16:00 GMT", impact: "High" },
    { event: "CPI (USD)", time: "13:30 GMT", impact: "High" },
  ],
  SPX500: [
    { event: "US Market Open", time: "14:30 GMT", impact: "Low" }, // not in calendarEvents (example)
    { event: "CPI (USD)", time: "13:30 GMT", impact: "High" },
  ],
  ETHUSD: [{ event: "ETH Network Update", time: "18:00 GMT", impact: "Medium" }], // not in calendarEvents (example)
};

// Quick insights per asset
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
   NEWS → CALENDAR MATCHING (AUTO)
======================= */

type CalendarEvent = (typeof calendarEvents)[0];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractCurrencyFromLabel = (label: string) => {
  const m = label.match(/\(([A-Z]{3})\)/);
  return m?.[1] ?? null;
};

const extractTimeHHMM = (timeStr: string) => {
  const m = timeStr.match(/(\d{1,2}:\d{2})/);
  if (!m) return null;
  const [hh, mm] = m[1].split(":");
  return `${hh.padStart(2, "0")}:${mm}`;
};

const normalizeEventAlias = (label: string) => {
  const raw = normalize(label);

  if (raw === "cpi") return "us cpi";
  if (raw.includes("core cpi")) return "core cpi";
  if (raw.includes("interest rate decision")) return "interest rate decision";
  if (raw.includes("non farm payroll")) return "non farm payrolls";

  return raw;
};

const scoreCalendarMatch = (args: {
  pillLabel: string;
  pillCurrency: string | null;
  pillTime: string | null;
  candidate: CalendarEvent;
}) => {
  const { pillLabel, pillCurrency, pillTime, candidate } = args;

  const pillNorm = normalizeEventAlias(pillLabel);
  const candNorm = normalize(candidate.event);

  let score = 0;

  if (candNorm === pillNorm) score += 6;
  if (candNorm.includes(pillNorm) || pillNorm.includes(candNorm)) score += 4;

  const pillTokens = new Set(pillNorm.split(" ").filter(Boolean));
  const candTokens = new Set(candNorm.split(" ").filter(Boolean));
  let overlap = 0;
  pillTokens.forEach((t) => {
    if (candTokens.has(t)) overlap += 1;
  });
  score += overlap;

  if (pillCurrency && candidate.currency?.toUpperCase() === pillCurrency.toUpperCase()) score += 3;
  if (pillTime && candidate.time === pillTime) score += 2;
  if (candidate.impact === "high") score += 0.5;

  return score;
};

/* =======================
   CALENDAR-FIRST NEWS BUILD
======================= */

type NewsPill = {
  key: string;
  event: string;
  time: string; // display
  impact: "High" | "Medium" | "Low";
  calendarEvent?: CalendarEvent; // if present, open directly (no matching)
};

const toPillImpact = (impact: CalendarEvent["impact"]): "High" | "Medium" | "Low" =>
  impact === "high" ? "High" : impact === "medium" ? "Medium" : "Low";

const getRelevantCurrenciesForAsset = (symbol: string) => {
  const s = (symbol || "").toUpperCase();

  // FX pairs like EURUSD, GBPUSD, USDCAD
  if (/^[A-Z]{6}$/.test(s)) {
    return [s.slice(0, 3), s.slice(3, 6)];
  }

  // Metals/crypto vs USD (use USD news)
  if (s.endsWith("USD")) return ["USD"];

  // Indices (SPX500 etc) (use USD news by default)
  if (s.includes("SPX") || s.includes("NAS") || s.includes("US")) return ["USD"];

  return ["USD"];
};

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { getAssetBySymbol } = useAssets();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const returnFilter = searchParams.get("from") || "All";

  const asset = symbol ? getAssetBySymbol(symbol) : undefined;
  const isWatchlisted = symbol ? isInWatchlist(symbol) : false;

  const [open, setOpen] = useState(true);

  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const closeToMarkets = () => {
    navigate(`/markets?filter=${returnFilter}`, { replace: true });
  };

  const handleToggleWatchlist = () => {
    if (symbol) toggleWatchlist(symbol);
  };

  const openCalendarOverlayDirect = useCallback((ev: CalendarEvent) => {
    setSelectedCalendarEvent(ev);
    setIsEventModalOpen(true);
  }, []);

  const openCalendarOverlayFromNewsPill = useCallback((newsLabel: string, newsTime: string) => {
    const pillCurrency = extractCurrencyFromLabel(newsLabel);
    const pillTime = extractTimeHHMM(newsTime);

    let best: { ev: CalendarEvent; score: number } | null = null;

    for (const ev of calendarEvents) {
      const s = scoreCalendarMatch({
        pillLabel: newsLabel,
        pillCurrency,
        pillTime,
        candidate: ev,
      });

      if (!best || s > best.score) best = { ev, score: s };
    }

    if (!best || best.score < 4) {
      toast.error("No matching calendar event found for this news item yet.");
      return;
    }

    setSelectedCalendarEvent(best.ev);
    setIsEventModalOpen(true);
  }, []);

  const closeCalendarOverlay = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
  }, []);

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

  // ✅ Build News Impact pills: calendar-first + extras
  const newsImpactPills: NewsPill[] = useMemo(() => {
    if (!symbol) return [];

    const relevantCurrencies = new Set(getRelevantCurrenciesForAsset(symbol));

    const fromCalendar: NewsPill[] = calendarEvents
      .filter((ev) => relevantCurrencies.has((ev.currency || "").toUpperCase()))
      .map((ev) => ({
        key: `cal-${ev.id}`,
        event: ev.event,
        time: `${ev.time} GMT`,
        impact: toPillImpact(ev.impact),
        calendarEvent: ev,
      }));

    const extras = (assetNewsEvents[symbol] || []).map((n, idx) => ({
      key: `extra-${symbol}-${idx}-${n.event}`,
      event: n.event,
      time: n.time,
      impact: n.impact,
    }));

    // Avoid duplicates where the extra is basically the same as a calendar event
    const calNormSet = new Set(fromCalendar.map((p) => normalize(p.event)));
    const filteredExtras = extras.filter((x) => !calNormSet.has(normalize(x.event)));

    // Calendar events first, then extras
    return [...fromCalendar, ...filteredExtras];
  }, [symbol]);

  if (!asset) {
    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) closeToMarkets();
        }}
      >
        <DialogContent className="max-w-xl w-[96vw] bg-background border-border">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Asset not found</h1>
            <Button onClick={() => navigate("/markets")}>Back to Markets</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) closeToMarkets();
        }}
      >
        <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto scrollbar-hidden bg-background border-border p-0">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">{asset.symbol}</h2>
              <Badge variant="outline" className="text-xs">
                Live Data
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="p-8">
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* LEFT */}
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
                      <span className="text-3xl font-semibold text-foreground">{asset.latestPrice}</span>
                      <span
                        className={`text-lg font-medium ${
                          asset.priceChange.startsWith("+") ? "text-success" : "text-destructive"
                        }`}
                      >
                        {asset.priceChange}
                      </span>
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

                      {/* ✅ NEWS IMPACT (calendar-first) */}
                      {newsImpactPills.length > 0 && (
                        <div className="mt-5">
                          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                            News Impact
                          </h3>

                          <div className="space-y-2">
                            {newsImpactPills.map((newsItem) => {
                              const impactColors = {
                                High: "bg-destructive text-destructive-foreground",
                                Medium: "bg-warning text-warning-foreground",
                                Low: "bg-success text-success-foreground",
                              } as const;

                              return (
                                <button
                                  key={newsItem.key}
                                  type="button"
                                  onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    // Calendar-first: open exact event
                                    if (newsItem.calendarEvent) {
                                      openCalendarOverlayDirect(newsItem.calendarEvent);
                                      return;
                                    }

                                    // Fallback: try to match
                                    openCalendarOverlayFromNewsPill(newsItem.event, newsItem.time);
                                  }}
                                  className="w-full flex items-center gap-2 text-left hover:bg-muted/30 rounded-md px-2 py-1.5 transition-colors group"
                                >
                                  <span
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                      impactColors[newsItem.impact]
                                    }`}
                                  >
                                    {newsItem.impact}
                                  </span>
                                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                                    {newsItem.event}
                                  </span>
                                  <span className="text-sm text-muted-foreground">—</span>
                                  <span className="text-sm text-muted-foreground">{newsItem.time}</span>
                                </button>
                              );
                            })}
                          </div>

                          <p className="text-xs text-muted-foreground mt-2">
                            Calendar events open directly. “Extra” items use best-match until they exist in{" "}
                            <code>calendarEvents</code>.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT */}
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
                      <span className="text-sm text-muted-foreground uppercase tracking-wide mb-6">Current Bias</span>
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

            {/* AI MARKET OVERVIEW */}
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
                    <strong className={getBiasColor(asset.biasDirection)}>{asset.biasDirection.toLowerCase()}</strong>{" "}
                    bias with {asset.biasConfidence}% confidence based on our multi-timeframe analysis.
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

            {/* Grid */}
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
                      <div key={index} className="p-2 bg-muted/30 rounded-lg">
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
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EventDetailsModal
        event={selectedCalendarEvent as any}
        isOpen={isEventModalOpen}
        onClose={closeCalendarOverlay}
      />
    </>
  );
}
