import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  Info, 
  Clock, 
  Star, 
  Bell, 
  ArrowLeft,
  Calendar,
  BarChart3
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
  // Generate mock data that varies slightly per event
  const baseValues = [185, 225, 165, 253, 281, 209, 187, 227, 336, 150, 199];
  const seed = eventName.length;
  return [
    { period: "Jan 24", actual: baseValues[0] + (seed * 5) },
    { period: "Feb 24", actual: baseValues[1] - (seed * 3) },
    { period: "Mar 24", actual: baseValues[2] + (seed * 7) },
    { period: "Apr 24", actual: baseValues[3] - (seed * 2) },
    { period: "May 24", actual: baseValues[4] + (seed * 4) },
    { period: "Jun 24", actual: baseValues[5] - (seed * 6) },
    { period: "Jul 24", actual: baseValues[6] + (seed * 3) },
    { period: "Aug 24", actual: baseValues[7] - (seed * 5) },
    { period: "Sep 24", actual: baseValues[8] + (seed * 2) },
    { period: "Oct 24", actual: baseValues[9] - (seed * 4) },
    { period: "Nov 24", actual: baseValues[10] + (seed * 6) },
    { period: "Dec 24", actual: null, forecast: 190 + seed },
  ];
};

// Market interpretation text based on event type
const getMarketInterpretation = (eventName: string, isReleased: boolean) => {
  const interpretations: Record<string, string> = {
    "Non-Farm Payrolls": "Non-Farm Payrolls (NFP) measures the change in the number of employed people in the US, excluding farm workers. A higher than expected reading is typically bullish for USD, while a lower reading is bearish. This is one of the most market-moving economic indicators.",
    "Unemployment Rate": "The Unemployment Rate measures the percentage of the total workforce that is unemployed and actively seeking employment. Lower unemployment is generally positive for the currency as it indicates economic strength.",
    "German Factory Orders": "German Factory Orders measures the change in the total value of new purchase orders placed with manufacturers. Strong orders indicate robust economic activity and are generally positive for EUR.",
    "ECB Interest Rate Decision": "The European Central Bank's interest rate decision directly impacts EUR valuation. Higher rates attract foreign investment, strengthening the currency, while lower rates tend to weaken it.",
    "Employment Change": "Employment Change measures the change in the number of employed people. Strong employment growth is bullish for CAD as it indicates economic expansion and potential inflationary pressure.",
    "BOE Interest Rate Decision": "The Bank of England's interest rate decision is crucial for GBP. Rate hikes typically strengthen the pound, while cuts or dovish guidance tend to weaken it.",
  };
  
  if (!isReleased) {
    return (interpretations[eventName] || "This economic indicator provides insight into the health of the economy. Market participants will closely watch the release for deviations from expectations.") + "\n\n⏳ Awaiting data release...";
  }
  
  return interpretations[eventName] || "This economic indicator provides insight into the health of the economy. The released data will be analyzed for its implications on monetary policy and market sentiment.";
};

// Event narrative based on release status
const getEventNarrative = (event: CalendarEvent) => {
  if (event.actual === "—") {
    return null;
  }
  
  const narratives: Record<string, string> = {
    "Non-Farm Payrolls": `The US economy added ${event.actual} jobs in the latest reporting period, compared to expectations of ${event.forecast}. This suggests continued resilience in the labor market, with implications for Federal Reserve policy decisions.`,
    "Unemployment Rate": `Unemployment came in at ${event.actual}, against forecasts of ${event.forecast}. This reading indicates the current state of the US labor market and will factor into Fed deliberations.`,
    "ECB Interest Rate Decision": `The ECB has set rates at ${event.actual}, in line with/diverging from market expectations of ${event.forecast}. This decision reflects the central bank's assessment of inflation and economic conditions.`,
  };
  
  return narratives[event.event] || `The ${event.event} data was released at ${event.actual}, compared to the forecast of ${event.forecast}. Market participants are now assessing the implications for monetary policy and economic outlook.`;
};

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
  if (!event) return null;

  const isReleased = event.actual !== "—";
  const historicalData = getHistoricalData(event.event);
  const maxValue = Math.max(...historicalData.map(d => d.actual || d.forecast || 0));
  const interpretation = getMarketInterpretation(event.event, isReleased);
  const narrative = getEventNarrative(event);

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'destructive';
    if (impact === 'medium') return 'default';
    return 'secondary';
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        {/* Header */}
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold">
                  {event.currency}
                </Badge>
                <Badge variant={getImpactColor(event.impact)} className="text-xs">
                  {event.impact.toUpperCase()} IMPACT
                </Badge>
              </div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                {event.event}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Today at {event.time} GMT</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5"
              onClick={handleAddToWatchlist}
            >
              <Star className="h-3.5 w-3.5" />
              Add to Watchlist
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5"
              onClick={handleSetAlert}
            >
              <Bell className="h-3.5 w-3.5" />
              Set Release Alert
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Market Interpretation */}
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Market Interpretation</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {interpretation}
              </p>
            </CardContent>
          </Card>

          {/* Current Event Figures */}
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Current Release Figures</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Previous</div>
                  <div className="text-lg font-semibold text-foreground">{event.previous}</div>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Forecast</div>
                  <div className="text-lg font-semibold text-foreground">{event.forecast}</div>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Actual</div>
                  <div className={`text-lg font-semibold ${isReleased ? 'text-primary' : 'text-muted-foreground'}`}>
                    {event.actual}
                  </div>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Deviation</div>
                  <div className="text-lg font-semibold text-muted-foreground">
                    {isReleased ? "—" : "Pending"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historical Trend Chart */}
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Historical Trend (demo)</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Annual performance trend based on previous releases (demo)
              </p>
              
              {/* Chart Container - Scrollable on mobile */}
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="min-w-[500px]">
                  {/* Grid background */}
                  <div className="relative h-40 border-l border-b border-border/50">
                    {/* Horizontal grid lines */}
                    {[0, 25, 50, 75, 100].map((percent) => (
                      <div
                        key={percent}
                        className="absolute left-0 right-0 border-t border-border/30"
                        style={{ bottom: `${percent}%` }}
                      >
                        {percent > 0 && (
                          <span className="absolute -left-1 -translate-x-full text-[9px] text-muted-foreground -translate-y-1/2">
                            {Math.round((maxValue * percent) / 100)}
                          </span>
                        )}
                      </div>
                    ))}
                    
                    {/* Bars container */}
                    <div className="absolute inset-0 flex items-end justify-between gap-1 px-1 pb-0">
                      {historicalData.map((item, index) => {
                        const value = item.actual || item.forecast || 0;
                        const heightPercent = (value / maxValue) * 100;
                        const isForecast = item.actual === null;
                        
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div
                              className={`w-full max-w-[28px] rounded-t transition-all duration-300 ${
                                isForecast
                                  ? "border-2 border-dashed border-primary/60 bg-primary/10"
                                  : "bg-primary hover:bg-primary/80"
                              }`}
                              style={{ height: `${heightPercent}%`, minHeight: value > 0 ? "4px" : "0" }}
                              title={`${item.period}: ${value}${isForecast ? " (Forecast)" : ""}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* X-axis labels */}
                  <div className="flex justify-between gap-1 px-1 mt-1.5">
                    {historicalData.map((item, index) => (
                      <div key={index} className="flex-1 text-center">
                        <span className={`text-[8px] ${item.actual === null ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {item.period}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                  <span className="text-[10px] text-muted-foreground">Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm border border-dashed border-primary/60 bg-primary/10" />
                  <span className="text-[10px] text-muted-foreground">Forecast</span>
                </div>
              </div>
              
              {/* Interpretation bullets */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-1 mb-2">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">How to interpret</span>
                </div>
                <ul className="space-y-1">
                  <li className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-primary mt-1 shrink-0" />
                    <span>Rising trend indicates strengthening labour or economic performance</span>
                  </li>
                  <li className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-primary mt-1 shrink-0" />
                    <span>Large deviations between releases may indicate market uncertainty</span>
                  </li>
                  <li className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-primary mt-1 shrink-0" />
                    <span>Traders often compare last 6–12 months for seasonal bias</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Event Narrative */}
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Release Commentary</h3>
              </div>
              {narrative ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {narrative}
                </p>
              ) : (
                <div className="bg-background/50 rounded-lg p-4 text-center">
                  <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Awaiting release. Commentary will appear once data is published.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
