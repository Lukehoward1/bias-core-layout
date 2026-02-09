import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface CalendarEvent {
  time: string;
  currency: string;
  event: string;
  previous: string;
  forecast: string;
  actual: string;
  impact: string;
}

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

// Mock historical data generator based on event
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

// Market interpretation with bullish/bearish focus
const getMarketInterpretation = (eventName: string, currency: string, _isReleased: boolean) => {
  const interpretations: Record<
    string,
    { description: string; impact: string; bias: "bullish" | "bearish" | "neutral"; pairs: string[] }
  > = {
    "Non-Farm Payrolls": {
      description:
        "Measures monthly change in employment excluding agricultural sector. A key indicator of US labor market health and economic activity.",
      impact:
        "Higher-than-expected NFP is typically bullish for USD, signaling strong job creation and economic momentum. Lower readings are bearish for USD as they may prompt Fed rate cuts.",
      bias: "bullish",
      pairs: ["EURUSD", "GBPUSD", "USDJPY", "USDCHF"],
    },
    "Unemployment Rate": {
      description:
        "Measures the percentage of the labor force actively seeking employment. A lagging indicator that confirms broader economic trends.",
      impact:
        "Lower-than-expected unemployment is usually bullish for USD, especially against EUR, GBP and JPY. Higher unemployment is bearish as it suggests economic weakness and potential policy easing.",
      bias: "bullish",
      pairs: ["EURUSD", "GBPUSD", "USDJPY"],
    },
    "German Factory Orders": {
      description:
        "Measures the change in value of new orders placed with manufacturers. A leading indicator of production and economic health.",
      impact:
        "Higher-than-expected orders are bullish for EUR, indicating robust manufacturing demand. Lower readings are bearish as they suggest weakening industrial activity.",
      bias: "neutral",
      pairs: ["EURUSD", "EURGBP", "EURJPY"],
    },
    "ECB Interest Rate Decision": {
      description:
        "The European Central Bank's decision on benchmark interest rates. One of the most impactful events for EUR pairs.",
      impact:
        "Rate hikes or hawkish guidance are bullish for EUR as higher rates attract foreign capital. Rate cuts or dovish signals are bearish. Surprises move price most.",
      bias: "neutral",
      pairs: ["EURUSD", "EURGBP", "EURJPY", "EURCHF"],
    },
    "Employment Change": {
      description:
        "Measures the change in the number of employed people. A key labor market indicator for economic health.",
      impact:
        "Stronger-than-expected job growth is bullish for CAD as it signals economic strength and supports BoC tightening. Weaker readings are bearish.",
      bias: "bullish",
      pairs: ["USDCAD", "CADJPY", "EURCAD"],
    },
    "BOE Interest Rate Decision": {
      description:
        "The Bank of England's decision on the UK base rate. The primary tool for monetary policy in the UK.",
      impact:
        "Rate hikes or hawkish tone are bullish for GBP, attracting yield-seeking flows. Rate cuts or dovish guidance are bearish. Watch for voting split and MPC commentary.",
      bias: "neutral",
      pairs: ["GBPUSD", "EURGBP", "GBPJPY"],
    },
    "US CPI": {
      description:
        "Measures inflation at the consumer level. One of the most market-moving releases for USD and risk assets.",
      impact:
        "Higher-than-expected CPI is typically bullish for USD (higher rates for longer). Lower-than-expected CPI is usually bearish for USD and supportive for risk assets.",
      bias: "neutral",
      pairs: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
    },
    "US Core CPI": {
      description:
        "Measures inflation excluding food and energy. Often watched more closely than headline CPI for policy expectations.",
      impact:
        "A higher core print usually supports USD (hawkish Fed expectations). A weaker core print tends to weigh on USD and support risk sentiment.",
      bias: "neutral",
      pairs: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
    },
  };

  const defaultInterpretation = {
    description: `This economic indicator provides insight into ${currency} economic conditions and may influence central bank policy decisions.`,
    impact: `Better-than-forecast data is typically bullish for ${currency}, while weaker readings tend to be bearish. The magnitude of the surprise often determines market reaction strength.`,
    bias: "neutral" as const,
    pairs: [`${currency}USD`, `EUR${currency}`, `${currency}JPY`],
  };

  return interpretations[eventName] || defaultInterpretation;
};

// How to interpret guidance
const getInterpretationGuide = (_eventName: string, currency: string) => {
  return [
    `Strong deviation (>2x consensus range) typically causes immediate price reaction in ${currency} pairs`,
    "Initial spike may reverse as traders digest the full context of the release",
    "Consider waiting 5-15 minutes after release for volatility to settle before entering positions",
    "Compare actual vs forecast AND vs previous reading for full context",
    "Watch for revisions to prior data which can amplify or dampen the reaction",
  ];
};

// Event narrative based on release status
const getEventNarrative = (event: CalendarEvent) => {
  if (event.actual === "—") return null;

  const narratives: Record<string, string> = {
    "Non-Farm Payrolls": `The US economy added ${event.actual} jobs in the latest reporting period, compared to expectations of ${event.forecast}. This suggests continued resilience in the labor market, with implications for Federal Reserve policy decisions.`,
    "Unemployment Rate": `Unemployment came in at ${event.actual}, against forecasts of ${event.forecast}. This reading indicates the current state of the US labor market and will factor into Fed deliberations.`,
    "ECB Interest Rate Decision": `The ECB has set rates at ${event.actual}, in line with/diverging from market expectations of ${event.forecast}. This decision reflects the central bank's assessment of inflation and economic conditions.`,
    "US CPI": `US CPI printed at ${event.actual} versus ${event.forecast} forecast. Traders will reassess rate expectations and USD strength based on the inflation surprise.`,
    "US Core CPI": `US Core CPI printed at ${event.actual} versus ${event.forecast} forecast. Core inflation is closely watched for policy direction and USD repricing.`,
  };

  return (
    narratives[event.event] ||
    `The ${event.event} data was released at ${event.actual}, compared to the forecast of ${event.forecast}. Market participants are now assessing the implications for monetary policy and economic outlook.`
  );
};

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!event) return null;

  const isReleased = event.actual !== "—";

  const historicalData = useMemo(() => getHistoricalData(event.event), [event.event]);
  const maxValue = Math.max(...historicalData.map((d) => d.actual || d.forecast || 0));

  const interpretation = useMemo(
    () => getMarketInterpretation(event.event, event.currency, isReleased),
    [event.event, event.currency, isReleased],
  );

  const narrative = useMemo(() => getEventNarrative(event), [event]);
  const interpretationGuide = useMemo(
    () => getInterpretationGuide(event.event, event.currency),
    [event.event, event.currency],
  );

  const getImpactColor = (impact: string) => {
    if (impact === "high") return "bg-destructive text-destructive-foreground";
    if (impact === "medium") return "bg-warning text-warning-foreground";
    return "bg-muted text-muted-foreground";
  };

  const handleAddToWatchlist = () => {
    toast.success("Added to Watchlist (demo)", {
      description: `${event.event} has been added to your watchlist.`,
    });
  };

  const handleSetAlert = () => {
    toast.success("Release Alert Scheduled (demo)", {
      description: `You'll be notified when ${event.event} is released.`,
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

  /**
   * ✅ KEY FIX:
   * Close this event modal first, then navigate to the clicked pair.
   * This prevents the new pair modal from appearing "behind" the event modal.
   */
  const openPairFromEvent = (pair: string) => {
    // Close event card first
    onClose();

    // Keep whatever "from" filter is already in the URL if present
    const from = new URLSearchParams(location.search).get("from") ?? "All";

    // Navigate on next tick so the modal has actually unmounted
    setTimeout(() => {
      navigate(`/asset/${pair}?from=${encodeURIComponent(from)}`, {
        state: { backgroundLocation: location.state?.backgroundLocation ?? location },
      });
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Explicit overlay click-to-close */}
      <DialogOverlay onPointerDown={() => onClose()} />

      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto scrollbar-hidden bg-background border-border p-0">
        {/* Header Row */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-sm font-bold px-3 py-1.5 bg-muted/50">
                {event.currency}
              </Badge>
              <Badge className={`text-xs font-semibold ${getImpactColor(event.impact)}`}>
                {event.impact.toUpperCase()} IMPACT
              </Badge>
              <h2 className="text-2xl font-bold text-foreground">{event.event}</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Today at {event.time} GMT</span>
              </div>

              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAddToWatchlist}>
                  <Star className="h-3.5 w-3.5" />
                  Watchlist
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSetAlert}>
                  <Bell className="h-3.5 w-3.5" />
                  Set Alert
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Interpretation */}
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
                      {getBiasLabel(interpretation.bias)} for {event.currency}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{interpretation.impact}</p>

                <div className="pt-4 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Most Impacted Pairs</div>

                  {/* ✅ NOW CLICKABLE and opens on top (closes modal first) */}
                  <div className="flex flex-wrap gap-2">
                    {interpretation.pairs.map((pair) => (
                      <button
                        key={pair}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openPairFromEvent(pair);
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
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Release Figures */}
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
                    <div className="text-2xl font-bold text-foreground">{event.previous}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Forecast</div>
                    <div className="text-2xl font-bold text-foreground">{event.forecast}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Actual</div>
                    <div className={`text-2xl font-bold ${isReleased ? "text-primary" : "text-muted-foreground"}`}>
                      {event.actual}
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
                      <span>Awaiting release – commentary will appear after publication.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historical Trend */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Historical Trend</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-primary" />
                    <span className="text-xs text-muted-foreground">Actual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm border-2 border-dashed border-muted-foreground bg-muted/30" />
                    <span className="text-xs text-muted-foreground">Forecast</span>
                  </div>
                </div>
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

          {/* How to Interpret */}
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
      </DialogContent>
    </Dialog>
  );
}
