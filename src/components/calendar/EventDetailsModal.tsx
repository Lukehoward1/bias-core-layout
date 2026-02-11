import { useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAssets } from "@/hooks/use-watchlist";
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
  impact: string; // "high" | "medium" | "low"
}

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

const getInterpretationGuide = (_eventName: string, currency: string) => {
  return [
    `Strong deviation (>2x consensus range) typically causes immediate price reaction in ${currency} pairs`,
    "Initial spike may reverse as traders digest the full context of the release",
    "Consider waiting 5-15 minutes after release for volatility to settle before entering positions",
    "Compare actual vs forecast AND vs previous reading for full context",
    "Watch for revisions to prior data which can amplify or dampen the reaction",
  ];
};

const getEventNarrative = (event: CalendarEvent) => {
  if (event.actual === "—") return null;

  const narratives: Record<string, string> = {
    "Non-Farm Payrolls": `The US economy added ${event.actual} jobs in the latest reporting period, compared to expectations of ${event.forecast}.`,
    "Unemployment Rate": `Unemployment came in at ${event.actual}, against forecasts of ${event.forecast}.`,
    "ECB Interest Rate Decision": `The ECB has set rates at ${event.actual}, compared to expectations of ${event.forecast}.`,
    "US CPI": `US CPI printed at ${event.actual} versus ${event.forecast} forecast.`,
    "US Core CPI": `US Core CPI printed at ${event.actual} versus ${event.forecast} forecast.`,
  };

  return (
    narratives[event.event] ||
    `The ${event.event} data was released at ${event.actual}, compared to the forecast of ${event.forecast}.`
  );
};

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAssetBySymbol } = useAssets();

  // ✅ IMPORTANT: keep hooks stable even when event is null
  const safeEvent: CalendarEvent = useMemo(
    () =>
      event ?? {
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
  const maxValue = useMemo(() => Math.max(...historicalData.map((d) => d.actual || d.forecast || 0)), [historicalData]);

  const interpretation = useMemo(
    () => getMarketInterpretation(safeEvent.event, safeEvent.currency, isReleased),
    [safeEvent.event, safeEvent.currency, isReleased],
  );

  const narrative = useMemo(() => getEventNarrative(safeEvent), [safeEvent]);
  const interpretationGuide = useMemo(
    () => getInterpretationGuide(safeEvent.event, safeEvent.currency),
    [safeEvent.event, safeEvent.currency],
  );

  const getImpactColor = (impact: string) => {
    const v = (impact || "").toLowerCase();
    if (v === "high") return "bg-destructive text-destructive-foreground";
    if (v === "medium") return "bg-warning text-warning-foreground";
    return "bg-muted text-muted-foreground";
  };

  const handleAddToWatchlist = () => {
    toast.success("Added to Watchlist (demo)", {
      description: `${safeEvent.event} has been added to your watchlist.`,
    });
  };

  const handleSetAlert = () => {
    toast.success("Release Alert Scheduled (demo)", {
      description: `You'll be notified when ${safeEvent.event} is released.`,
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

  // ✅ Close event modal, then open global asset modal on next frame
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

  // ✅ If no event, render nothing (but hooks already ran safely)
  if (!event) return null;

  return (
  const location = useLocation();
const state = location.state as { backgroundLocation?: Location } | null;
const backgroundLocation = state?.backgroundLocation;

return (
  <>
    <Routes location={backgroundLocation || location}>
      {/* normal routes */}
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/markets" element={<Markets />} />
      {/* etc */}
    </Routes>

    {backgroundLocation && (
      <Routes>
        <Route path="/asset/:symbol" element={<AssetDetail />} />
      </Routes>
    )}
  </>
);
          {/* ...your existing JSX stays exactly the same below... */}

          <div className="sticky top-0 z-10 bg-background border-b border-border px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-sm font-bold px-3 py-1.5 bg-muted/50">
                  {safeEvent.currency}
                </Badge>
                <Badge className={`text-xs font-semibold ${getImpactColor(safeEvent.impact)}`}>
                  {(safeEvent.impact || "").toUpperCase()} IMPACT
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
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSetAlert}>
                    <Bell className="h-3.5 w-3.5" />
                    Set Alert
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* KEEP THE REST OF YOUR CONTENT AS-IS */}
          {/* (I’m not repeating it here to avoid accidental differences) */}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
