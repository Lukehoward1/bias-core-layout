import { useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAssets } from "@/hooks/use-watchlist";
import { useAlertsContext } from "@/contexts/AlertsContext";
import type { CalendarEvent } from "@/data/calendarEvents";

import {
  TrendingUp,
  Clock,
  Star,
  Bell,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  MessageSquare,
  Minus,
} from "lucide-react";
import { toast } from "sonner";

/* =======================
   Props
======================= */

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

/* =======================
   Demo helpers
======================= */

const getHistoricalData = (eventName: string) => {
  const baseValues = [185, 225, 165, 253, 281, 209, 187, 227];
  const seed = eventName.length;

  return [
    { period: "May", actual: baseValues[0] + seed * 5, forecast: baseValues[0] + seed * 3 },
    { period: "Jun", actual: baseValues[1] - seed * 3, forecast: baseValues[1] - seed * 5 },
    { period: "Jul", actual: baseValues[2] + seed * 7, forecast: baseValues[2] + seed * 4 },
    { period: "Aug", actual: baseValues[3] - seed * 2, forecast: baseValues[3] + seed * 1 },
    { period: "Sep", actual: baseValues[4] + seed * 4, forecast: baseValues[4] + seed * 2 },
    { period: "Oct", actual: baseValues[5] - seed * 6, forecast: baseValues[5] - seed * 3 },
    { period: "Nov", actual: baseValues[6] + seed * 3, forecast: baseValues[6] + seed * 5 },
    { period: "Dec", actual: null, forecast: baseValues[7] + seed },
  ];
};

const getMarketInterpretation = (eventName: string, currency: string) => {
  const interpretations: Record<
    string,
    { description: string; impact: string; bias: "bullish" | "bearish" | "neutral"; pairs: string[] }
  > = {
    "Non-Farm Payrolls": {
      description:
        "Measures monthly change in employment excluding the agricultural sector. It is one of the most important indicators of US labour market strength and economic momentum.",
      impact:
        "A stronger-than-expected NFP print is typically bullish for USD, as it supports growth expectations and can reinforce a more hawkish Federal Reserve outlook. A weaker print is usually bearish for USD.",
      bias: "bullish",
      pairs: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF"],
    },
    "Unemployment Rate": {
      description:
        "Measures the percentage of the labour force actively seeking employment. It helps confirm the strength or weakness of the broader economy.",
      impact:
        "Lower-than-expected unemployment is generally bullish for USD, while a higher reading is typically bearish as it may support expectations of looser monetary policy.",
      bias: "bullish",
      pairs: ["EURUSD", "GBPUSD", "USDJPY"],
    },
    "German Factory Orders": {
      description:
        "Measures the change in value of new orders placed with manufacturers. It is a useful leading indicator for production and industrial momentum in the euro area.",
      impact:
        "Higher-than-expected factory orders are usually supportive for EUR, while weaker readings can weigh on the currency by suggesting softer industrial demand.",
      bias: "neutral",
      pairs: ["EURUSD", "EURGBP", "EURJPY"],
    },
    "ECB Interest Rate Decision": {
      description:
        "The European Central Bank’s interest rate decision is one of the most important scheduled events for EUR markets and broader European risk sentiment.",
      impact:
        "A hike or hawkish guidance is generally bullish for EUR. A cut or dovish guidance is generally bearish. The market often reacts most strongly to surprises in tone and forward guidance.",
      bias: "neutral",
      pairs: ["EURUSD", "EURGBP", "EURJPY", "EURCHF"],
    },
    "BOE Interest Rate Decision": {
      description:
        "The Bank of England’s rate decision is the core monetary policy event for GBP and often drives sharp moves in sterling pairs.",
      impact:
        "A hawkish result or stronger-than-expected guidance is typically bullish for GBP. A dovish message or softer policy stance is generally bearish.",
      bias: "neutral",
      pairs: ["GBPUSD", "EURGBP", "GBPJPY"],
    },
    "US CPI": {
      description:
        "Measures consumer inflation in the United States. CPI is one of the most market-moving releases for USD, gold, yields, and US indices.",
      impact:
        "A higher-than-expected CPI reading is usually bullish for USD and bearish for gold and rate-sensitive risk assets. A softer reading often has the opposite effect.",
      bias: "neutral",
      pairs: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
    },
    "US Core CPI": {
      description:
        "Measures US inflation excluding food and energy. Core CPI is often watched especially closely for central bank policy expectations.",
      impact:
        "A stronger core print is usually bullish for USD because it can support higher-for-longer rate expectations. A weaker print is typically bearish for USD and supportive for risk sentiment.",
      bias: "neutral",
      pairs: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
    },
  };

  const defaultInterpretation = {
    description: `This economic indicator provides insight into ${currency} economic conditions and may influence central bank policy expectations.`,
    impact: `Stronger-than-expected data is often bullish for ${currency}, while weaker-than-expected data is often bearish. The size of the surprise usually determines the strength of the market reaction.`,
    bias: "neutral" as const,
    pairs: [`${currency}USD`, `EUR${currency}`, `${currency}JPY`],
  };

  return interpretations[eventName] || defaultInterpretation;
};

const getInterpretationGuide = (_eventName: string, currency: string) => {
  return [
    `Large deviations from forecast often cause the sharpest immediate move in ${currency} pairs.`,
    "Initial spikes can reverse once traders digest the full details of the release.",
    "Consider waiting a few minutes after release if volatility is extreme.",
    "Compare actual vs forecast and also vs previous for fuller context.",
    "Watch for revisions to prior data because they can change the market read.",
  ];
};

const getEventNarrative = (event: CalendarEvent) => {
  if (event.actual === "—") return null;

  const narratives: Record<string, string> = {
    "Non-Farm Payrolls": `The US economy added ${event.actual} jobs in the latest report, versus expectations of ${event.forecast}.`,
    "Unemployment Rate": `Unemployment came in at ${event.actual}, compared with a forecast of ${event.forecast}.`,
    "ECB Interest Rate Decision": `The ECB set rates at ${event.actual}, matching against an expected ${event.forecast}.`,
    "BOE Interest Rate Decision": `The BOE decision came in at ${event.actual}, versus a forecast of ${event.forecast}.`,
    "US CPI": `US CPI printed at ${event.actual}, versus a forecast of ${event.forecast}.`,
    "US Core CPI": `US Core CPI printed at ${event.actual}, versus a forecast of ${event.forecast}.`,
  };

  return (
    narratives[event.event] ||
    `The ${event.event} release came in at ${event.actual}, compared with a forecast of ${event.forecast}.`
  );
};

/* =======================
   Component
======================= */

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAssetBySymbol } = useAssets();
  const { alerts, addAlert, scheduleAlert } = useAlertsContext();

  const safeEvent = useMemo<CalendarEvent>(
    () =>
      event ?? {
        id: "placeholder",
        time: "00:00",
        currency: "—",
        event: "—",
        previous: "—",
        forecast: "—",
        actual: "—",
        impact: "low",
      },
    [event],
  );

  const isReleased = safeEvent.actual !== "—";

  const historicalData = useMemo(() => getHistoricalData(safeEvent.event), [safeEvent.event]);

  const maxValue = useMemo(() => {
    return Math.max(...historicalData.map((item) => item.actual || item.forecast || 0), 1);
  }, [historicalData]);

  const interpretation = useMemo(
    () => getMarketInterpretation(safeEvent.event, safeEvent.currency),
    [safeEvent.event, safeEvent.currency],
  );

  const narrative = useMemo(() => getEventNarrative(safeEvent), [safeEvent]);

  const interpretationGuide = useMemo(
    () => getInterpretationGuide(safeEvent.event, safeEvent.currency),
    [safeEvent.event, safeEvent.currency],
  );

  const hasExistingAlert = useMemo(() => {
    if (!event) return false;

    return alerts.some((alertItem) => {
      if (alertItem.eventId !== safeEvent.id) return false;
      return alertItem.status === "pending" || alertItem.status === "triggered";
    });
  }, [alerts, event, safeEvent.id]);

  const getImpactColor = (impact: CalendarEvent["impact"]) => {
    if (impact === "high") return "bg-destructive text-destructive-foreground";
    if (impact === "medium") return "bg-warning text-warning-foreground";
    return "bg-muted text-muted-foreground";
  };

  const handleAddToWatchlist = () => {
    toast.success("Added to Watchlist (demo)", {
      description: `${safeEvent.event} has been added to your watchlist.`,
    });
  };

  const handleSetAlert = () => {
    if (!event) return;

    if (hasExistingAlert) {
      toast.message("Alert already exists", {
        description: `${safeEvent.event} already has an alert set.`,
      });
      return;
    }

    const now = new Date();
    const [hours, minutes] = safeEvent.time.split(":").map(Number);

    const scheduledFor = new Date();
    scheduledFor.setHours(Number.isFinite(hours) ? hours : 0);
    scheduledFor.setMinutes(Number.isFinite(minutes) ? minutes : 0);
    scheduledFor.setSeconds(0);
    scheduledFor.setMilliseconds(0);

    if (scheduledFor.getTime() < now.getTime() && !isReleased) {
      scheduledFor.setDate(scheduledFor.getDate() + 1);
    }

    if (isReleased) {
      addAlert({
        type: "news",
        title: `${safeEvent.event} (${safeEvent.currency})`,
        message: `${safeEvent.event} has already been released. Actual: ${safeEvent.actual} vs Forecast: ${safeEvent.forecast}`,
        severity: safeEvent.impact === "high" ? "high" : "info",
        relatedAsset: safeEvent.currency,
        eventId: safeEvent.id,
        routeTo: "/calendar",
      });

      toast.success("Released event alert added", {
        description: `${safeEvent.event} has been added to your alerts.`,
      });

      return;
    }

    scheduleAlert({
      type: "news",
      title: `${safeEvent.event} (${safeEvent.currency})`,
      message: `Scheduled: ${safeEvent.event} at ${safeEvent.time} GMT`,
      severity: safeEvent.impact === "high" ? "high" : "info",
      relatedAsset: safeEvent.currency,
      eventId: safeEvent.id,
      routeTo: "/calendar",
      scheduledFor,
    });

    toast.success("Alert scheduled", {
      description: `${safeEvent.event} will notify you at ${safeEvent.time} GMT`,
    });
  };

  const getBiasIcon = (bias: string) => {
    if (bias === "bullish") return <ArrowUpRight className="h-4 w-4 text-success" />;
    if (bias === "bearish") return <ArrowDownRight className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-warning" />;
  };

  const getBiasLabel = (bias: string) => {
    if (bias === "bullish") return "Typically Bullish";
    if (bias === "bearish") return "Typically Bearish";
    return "Data-Dependent";
  };

  const getBiasColor = (bias: string) => {
    if (bias === "bullish") return "text-success";
    if (bias === "bearish") return "text-destructive";
    return "text-warning";
  };

  const goToAsset = useCallback(
    (symbol: string) => {
      onClose();

      requestAnimationFrame(() => {
        const state = location.state as { backgroundLocation?: Location } | null;
        const backgroundLocation = state?.backgroundLocation ?? location;

        navigate(`/asset/${symbol}`, {
          state: { backgroundLocation },
        });
      });
    },
    [navigate, location, onClose],
  );

  if (!event) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000]"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        />

        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto scrollbar-hidden bg-background border border-border p-0 rounded-lg z-[10001]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-background border-b border-border px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-sm font-bold px-3 py-1.5 bg-muted/50">
                  {safeEvent.currency}
                </Badge>

                <Badge className={`text-xs font-semibold ${getImpactColor(safeEvent.impact)}`}>
                  {safeEvent.impact.toUpperCase()} IMPACT
                </Badge>

                <h2 className="text-2xl font-bold text-foreground">{safeEvent.event}</h2>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Today at {safeEvent.time} GMT</span>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAddToWatchlist}>
                    <Star className="h-3.5 w-3.5" />
                    Watchlist
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleSetAlert}
                    disabled={hasExistingAlert}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    {hasExistingAlert ? "Alert Added" : "Set Alert"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Market Interpretation
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{interpretation.description}</p>

                  <div className="flex items-center gap-3 mb-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        interpretation.bias === "bullish"
                          ? "bg-success/20"
                          : interpretation.bias === "bearish"
                            ? "bg-destructive/20"
                            : "bg-warning/20"
                      }`}
                    >
                      {getBiasIcon(interpretation.bias)}
                    </div>

                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-0.5">Typical Market Reaction</div>
                      <div className={`text-sm font-semibold ${getBiasColor(interpretation.bias)}`}>
                        {getBiasLabel(interpretation.bias)} for {safeEvent.currency}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{interpretation.impact}</p>

                  <div className="pt-4 border-t border-border/50">
                    <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                      Most Impacted Pairs
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {interpretation.pairs.map((pair) => {
                        const exists = !!getAssetBySymbol(pair);

                        return exists ? (
                          <button
                            key={pair}
                            type="button"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              goToAsset(pair);
                            }}
                            className="focus:outline-none"
                          >
                            <Badge
                              variant="secondary"
                              className="text-xs font-mono cursor-pointer hover:bg-primary/20 transition-colors"
                            >
                              {pair}
                            </Badge>
                          </button>
                        ) : (
                          <span key={pair} title="Coming soon">
                            <Badge variant="secondary" className="text-xs font-mono opacity-50 cursor-not-allowed">
                              {pair}
                            </Badge>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Current Release Figures
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Previous</div>
                      <div className="text-2xl font-bold text-foreground">{safeEvent.previous}</div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Forecast</div>
                      <div className="text-2xl font-bold text-foreground">{safeEvent.forecast}</div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Actual</div>
                      <div className={`text-2xl font-bold ${isReleased ? "text-primary" : "text-muted-foreground"}`}>
                        {safeEvent.actual}
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Deviation</div>
                      <div className="text-2xl font-bold text-muted-foreground">{isReleased ? "—" : "Pending"}</div>
                    </div>
                  </div>

                  <div className="flex-1 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        Release Commentary
                      </span>
                    </div>

                    {narrative ? (
                      <p className="text-sm text-muted-foreground leading-relaxed">{narrative}</p>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border border-border/50">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>Awaiting release — commentary will appear after publication.</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Historical Trend</h3>
                </div>

                <div className="h-48 flex items-end justify-between gap-3 px-2">
                  {historicalData.map((item, index) => {
                    const actualHeight = item.actual ? (item.actual / maxValue) * 100 : 0;
                    const forecastHeight = (item.forecast / maxValue) * 100;
                    const isForecastOnly = item.actual === null;

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full h-40 flex items-end justify-center gap-1">
                          {!isForecastOnly && (
                            <div
                              className="w-full max-w-[24px] bg-primary rounded-t transition-all duration-300 hover:bg-primary/80"
                              style={{ height: `${actualHeight}%` }}
                              title={`Actual: ${item.actual}`}
                            />
                          )}

                          <div
                            className={`w-full max-w-[24px] rounded-t transition-all duration-300 ${
                              isForecastOnly
                                ? "border-2 border-dashed border-muted-foreground bg-muted/30"
                                : "border-2 border-dashed border-muted-foreground/50 bg-transparent"
                            }`}
                            style={{ height: `${forecastHeight}%` }}
                            title={`Forecast: ${item.forecast}`}
                          />
                        </div>

                        <span className="text-xs text-muted-foreground">{item.period}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">How to Interpret</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {interpretationGuide.map((tip, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border/50"
                    >
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-primary">{index + 1}</span>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
