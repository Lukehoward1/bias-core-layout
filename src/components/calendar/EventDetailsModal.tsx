import { useMemo, useCallback, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAssets } from "@/hooks/use-watchlist";
import { useAlertsContext } from "@/contexts/AlertsContext";
import type { CalendarEvent } from "@/data/calendarEvents";
import { getEventDateTime, formatCalendarEventDateLabel } from "@/services/calendarData";
import { getLiveCalendarEvents } from "@/services/calendarService";
import { HistoricalTrendChart } from "./HistoricalTrendChart";

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
  Inbox,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  openedFromAlert?: boolean;
}

const PERIOD_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseEventValue(s: string | null | undefined): number | null {
  if (!s || s === "—") return null;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function formatPeriod(dateStr: string): string {
  const parts = dateStr.split("-");
  const mm = parseInt(parts[1] ?? "1", 10);
  const dd = parseInt(parts[2] ?? "1", 10);
  return `${PERIOD_MONTHS[mm - 1] ?? ""} ${dd}`;
}

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

export function EventDetailsModal({ event, isOpen, onClose, openedFromAlert = false }: EventDetailsModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAssetBySymbol } = useAssets();
  const { alerts, recurringSubscriptions, addAlert, scheduleAlert, addRecurringSubscription } = useAlertsContext();

  const [alertMode, setAlertMode] = useState<"once" | "event-series">("once");
  const [liveEvents, setLiveEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    getLiveCalendarEvents()
      .then((events) => setLiveEvents(events))
      .catch(() => {});
  }, []);

  const safeEvent = useMemo<CalendarEvent>(
    () =>
      event ?? {
        id: "placeholder",
        eventKey: "placeholder",
        date: "1970-01-01",
        time: "00:00",
        scheduledAt: new Date("1970-01-01T00:00:00.000Z").toISOString(),
        currency: "—",
        event: "—",
        previous: "—",
        forecast: "—",
        actual: "—",
        impact: "low",
      },
    [event],
  );

  const eventDateTime = useMemo(() => getEventDateTime(safeEvent), [safeEvent]);
  const isValidEventDate = !Number.isNaN(eventDateTime.getTime());
  const isReleased = safeEvent.actual !== "—" || (isValidEventDate && eventDateTime.getTime() <= Date.now());

  const chartData = useMemo(() => {
    const filtered = liveEvents
      .filter((e) => e.event === safeEvent.event && e.actual !== "—")
      .sort((a, b) => a.date.localeCompare(b.date));

    return filtered.map((e) => ({
      period: formatPeriod(e.date),
      actual: parseEventValue(e.actual),
      forecast: parseEventValue(e.forecast) ?? undefined,
    }));
  }, [liveEvents, safeEvent.event]);

  const interpretation = useMemo(
    () => getMarketInterpretation(safeEvent.event, safeEvent.currency),
    [safeEvent.event, safeEvent.currency],
  );

  const narrative = useMemo(() => getEventNarrative(safeEvent), [safeEvent]);

  const interpretationGuide = useMemo(
    () => getInterpretationGuide(safeEvent.event, safeEvent.currency),
    [safeEvent.event, safeEvent.currency],
  );

  const hasExistingOneTimeAlert = useMemo(() => {
    if (!event) return false;

    return alerts.some((alertItem) => {
      if (alertItem.eventId !== safeEvent.id) return false;
      return alertItem.status === "pending" || alertItem.status === "triggered";
    });
  }, [alerts, event, safeEvent.id]);

  const hasExistingRecurringAlert = useMemo(() => {
    if (!event) return false;
    return recurringSubscriptions.some((item) => item.key === safeEvent.eventKey);
  }, [recurringSubscriptions, event, safeEvent.eventKey]);

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

    if (alertMode === "event-series") {
      if (hasExistingRecurringAlert) {
        toast.message("Recurring alert already exists", {
          description: `${safeEvent.event} is already set to recur.`,
        });
        return;
      }

      addRecurringSubscription({
        key: safeEvent.eventKey,
        eventName: safeEvent.event,
        currency: safeEvent.currency,
      });

      toast.success("Recurring alert enabled", {
        description: `You will be alerted every time ${safeEvent.event} appears again.`,
      });

      return;
    }

    if (hasExistingOneTimeAlert) {
      toast.message("Alert already exists", {
        description: `${safeEvent.event} already has an alert set.`,
      });
      return;
    }

    if (!isValidEventDate) {
      toast.error("Unable to schedule alert", {
        description: "This event does not currently have a valid scheduled time.",
      });
      return;
    }

    if (eventDateTime.getTime() <= Date.now() || safeEvent.actual !== "—") {
      addAlert({
        type: "news",
        title: `${safeEvent.event} (${safeEvent.currency})`,
        message: `${safeEvent.event} has already been released. Actual: ${safeEvent.actual} vs Forecast: ${safeEvent.forecast}`,
        severity: safeEvent.impact === "high" ? "high" : "info",
        relatedAsset: safeEvent.currency,
        eventId: safeEvent.id,
        routeTo: "/calendar",
        recurrence: "once",
        recurrenceKey: safeEvent.eventKey,
      });

      toast.success("Released event alert added", {
        description: `${safeEvent.event} has been added to your alerts.`,
      });

      return;
    }

    scheduleAlert({
      type: "news",
      title: `${safeEvent.event} (${safeEvent.currency})`,
      message: `Scheduled: ${safeEvent.event} at ${formatCalendarEventDateLabel(safeEvent)}`,
      severity: safeEvent.impact === "high" ? "high" : "info",
      relatedAsset: safeEvent.currency,
      eventId: safeEvent.id,
      routeTo: "/calendar",
      scheduledFor: eventDateTime,
      recurrence: "once",
      recurrenceKey: safeEvent.eventKey,
    });

    toast.success("Alert scheduled", {
      description: `${safeEvent.event} will notify you at ${formatCalendarEventDateLabel(safeEvent)}`,
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

  if (!event) {
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-sm bg-background border border-border rounded-lg z-[10001] p-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <DialogPrimitive.Title asChild>
                <span className="text-sm font-medium text-muted-foreground">Calendar Event</span>
              </DialogPrimitive.Title>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DialogPrimitive.Description className="sr-only">
              This calendar event could not be found or is no longer available.
            </DialogPrimitive.Description>
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
              <h2 className="text-base font-semibold text-foreground">Event not found</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This event may have expired or the link is no longer valid. Try browsing the calendar for upcoming
                events.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={onClose}>
                Close
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

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
          <DialogPrimitive.Description className="sr-only">
            Details, figures, and market interpretation for this economic calendar event.
          </DialogPrimitive.Description>
          <div className="sticky top-0 z-10 bg-background border-b border-border">
            {openedFromAlert && (
              <div className="px-8 py-3 border-b border-primary/15 bg-primary/5">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Inbox className="h-4 w-4" />
                  <span className="font-medium">Opened from alert</span>
                </div>
              </div>
            )}

            <div className="px-8 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-sm font-bold px-3 py-1.5 bg-muted/50">
                    {safeEvent.currency}
                  </Badge>

                  <Badge className={`text-xs font-semibold ${getImpactColor(safeEvent.impact)}`}>
                    {safeEvent.impact.toUpperCase()} IMPACT
                  </Badge>

                  <DialogPrimitive.Title asChild>
                    <h2 className="text-2xl font-bold text-foreground">{safeEvent.event}</h2>
                  </DialogPrimitive.Title>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatCalendarEventDateLabel(safeEvent)}</span>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAddToWatchlist}>
                      <Star className="h-3.5 w-3.5" />
                      Watchlist
                    </Button>

                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSetAlert}>
                      <Bell className="h-3.5 w-3.5" />
                      {alertMode === "event-series"
                        ? hasExistingRecurringAlert
                          ? "Recurring Added"
                          : "Set Recurring"
                        : hasExistingOneTimeAlert
                          ? "Alert Added"
                          : "Set Alert"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Button
                  variant={alertMode === "once" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAlertMode("once")}
                >
                  One-time alert
                </Button>

                <Button
                  variant={alertMode === "event-series" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAlertMode("event-series")}
                >
                  Recurring
                </Button>

                <span className="text-xs text-muted-foreground">
                  {alertMode === "event-series"
                    ? `This will alert you every time ${safeEvent.event} appears again.`
                    : "This will alert you for this event only."}
                </span>
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
                      <div
                        className={`text-2xl font-bold ${
                          safeEvent.actual !== "—" ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {safeEvent.actual}
                      </div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Deviation</div>
                      <div className="text-2xl font-bold text-muted-foreground">
                        {safeEvent.actual !== "—" ? "—" : "Pending"}
                      </div>
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

            <HistoricalTrendChart data={chartData} />

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
