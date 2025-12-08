import {
  Dialog,
  DialogContent,
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
  Calendar,
  BarChart3,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
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

// Market interpretation with bullish/bearish focus
const getMarketInterpretation = (eventName: string, currency: string, isReleased: boolean) => {
  const interpretations: Record<string, { text: string; bias: 'bullish' | 'bearish' | 'neutral'; pairs: string[] }> = {
    "Non-Farm Payrolls": {
      text: "Higher-than-expected NFP is typically bullish for USD, signaling strong job creation and economic momentum. Lower-than-expected readings are bearish for USD as they may prompt the Fed to consider rate cuts.",
      bias: 'bullish',
      pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF']
    },
    "Unemployment Rate": {
      text: "Lower-than-expected unemployment is usually bullish for USD, especially against EUR, GBP and JPY, as it signals stronger labour market conditions. Higher-than-expected unemployment is typically bearish for USD as it suggests economic weakness and may increase the chances of policy easing.",
      bias: 'bullish',
      pairs: ['EURUSD', 'GBPUSD', 'USDJPY']
    },
    "German Factory Orders": {
      text: "Higher-than-expected factory orders are bullish for EUR, indicating robust manufacturing demand. Lower readings are bearish for EUR as they suggest weakening industrial activity in the eurozone's largest economy.",
      bias: 'neutral',
      pairs: ['EURUSD', 'EURGBP', 'EURJPY']
    },
    "ECB Interest Rate Decision": {
      text: "Rate hikes or hawkish guidance are bullish for EUR as higher rates attract foreign capital. Rate cuts or dovish signals are bearish for EUR. Markets often price in expectations, so surprises move price most.",
      bias: 'neutral',
      pairs: ['EURUSD', 'EURGBP', 'EURJPY', 'EURCHF']
    },
    "Employment Change": {
      text: "Stronger-than-expected job growth is bullish for CAD as it signals economic strength and supports BoC tightening. Weaker readings are bearish for CAD and may weigh on rate expectations.",
      bias: 'bullish',
      pairs: ['USDCAD', 'CADJPY', 'EURCAD']
    },
    "BOE Interest Rate Decision": {
      text: "Rate hikes or hawkish tone are bullish for GBP, attracting yield-seeking flows. Rate cuts or dovish forward guidance are bearish for GBP. Watch for voting split and MPC commentary.",
      bias: 'neutral',
      pairs: ['GBPUSD', 'EURGBP', 'GBPJPY']
    },
  };

  const defaultInterpretation = {
    text: `Better-than-forecast data is typically bullish for ${currency}, while weaker-than-expected readings tend to be bearish. The magnitude of the surprise often determines the strength of the market reaction.`,
    bias: 'neutral' as const,
    pairs: [`${currency}USD`, `EUR${currency}`]
  };

  const interpretation = interpretations[eventName] || defaultInterpretation;
  
  const awaitingText = "\n\nWe are awaiting the new release – price may be volatile around the announcement.";
  
  return {
    ...interpretation,
    text: interpretation.text + (isReleased ? "" : awaitingText)
  };
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
  const interpretation = getMarketInterpretation(event.event, event.currency, isReleased);
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
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto scrollbar-hidden bg-card border-border p-0">
        {/* Header Row */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-sm font-bold px-3 py-1">
                {event.currency}
              </Badge>
              <Badge variant={getImpactColor(event.impact)} className="text-xs">
                {event.impact.toUpperCase()} IMPACT
              </Badge>
              <h2 className="text-xl font-semibold text-foreground">
                {event.event}
              </h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Today at {event.time} GMT</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 shrink-0">
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
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Two Column Layout: Market Interpretation + Current Figures */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Interpretation - Left Column */}
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Market Interpretation</h3>
                </div>
                
                {/* Bias Indicator */}
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-background/50">
                  {interpretation.bias === 'bullish' && (
                    <>
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Typical Bias</div>
                        <div className="text-sm font-medium text-emerald-500">Bullish for {event.currency}</div>
                      </div>
                    </>
                  )}
                  {interpretation.bias === 'bearish' && (
                    <>
                      <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Typical Bias</div>
                        <div className="text-sm font-medium text-red-500">Bearish for {event.currency}</div>
                      </div>
                    </>
                  )}
                  {interpretation.bias === 'neutral' && (
                    <>
                      <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Typical Bias</div>
                        <div className="text-sm font-medium text-amber-500">Data-Dependent</div>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-4">
                  {interpretation.text}
                </p>

                {/* Relevant Pairs */}
                <div className="pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground mb-2">Most impacted pairs:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {interpretation.pairs.map((pair) => (
                      <Badge key={pair} variant="secondary" className="text-xs font-mono">
                        {pair}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Release Figures - Right Column */}
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="pt-5 pb-5 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Current Release Figures</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div className="bg-background/50 rounded-lg p-4 flex flex-col justify-center">
                    <div className="text-xs text-muted-foreground mb-1">Previous</div>
                    <div className="text-2xl font-bold text-foreground">{event.previous}</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 flex flex-col justify-center">
                    <div className="text-xs text-muted-foreground mb-1">Forecast</div>
                    <div className="text-2xl font-bold text-foreground">{event.forecast}</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 flex flex-col justify-center">
                    <div className="text-xs text-muted-foreground mb-1">Actual</div>
                    <div className={`text-2xl font-bold ${isReleased ? 'text-primary' : 'text-muted-foreground'}`}>
                      {event.actual}
                    </div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 flex flex-col justify-center">
                    <div className="text-xs text-muted-foreground mb-1">Deviation</div>
                    <div className="text-2xl font-bold text-muted-foreground">
                      {isReleased ? "—" : "Pending"}
                    </div>
                  </div>
                </div>

                {/* Release Commentary */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Release Commentary</span>
                  </div>
                  {narrative ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {narrative}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Awaiting release. Commentary will appear once data is published.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historical Trend Chart - Full Width */}
          <Card className="bg-muted/30 border-border/50">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Historical Trend (demo)</h3>
                </div>
                {/* Legend inline on desktop */}
                <div className="hidden sm:flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-primary" />
                    <span className="text-xs text-muted-foreground">Actual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm border-2 border-dashed border-primary/60 bg-primary/10" />
                    <span className="text-xs text-muted-foreground">Forecast</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                Annual performance trend based on previous releases (demo)
              </p>
              
              {/* Chart Container - Scrollable on mobile */}
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="min-w-[600px]">
                  {/* Grid background */}
                  <div className="relative h-44 border-l border-b border-border/50">
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
                    <div className="absolute inset-0 flex items-end justify-between gap-2 px-2 pb-0">
                      {historicalData.map((item, index) => {
                        const value = item.actual || item.forecast || 0;
                        const heightPercent = (value / maxValue) * 100;
                        const isForecast = item.actual === null;
                        
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div
                              className={`w-full max-w-[36px] rounded-t transition-all duration-300 ${
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
                  <div className="flex justify-between gap-2 px-2 mt-2">
                    {historicalData.map((item, index) => (
                      <div key={index} className="flex-1 text-center">
                        <span className={`text-[9px] ${item.actual === null ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {item.period}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Legend - Mobile only */}
              <div className="flex sm:hidden items-center gap-4 mt-4 pt-3 border-t border-border/50">
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
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-1 mb-2">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">How to interpret</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-primary mt-1 shrink-0" />
                    <span>Rising trend indicates strengthening labour or economic performance</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-primary mt-1 shrink-0" />
                    <span>Large deviations between releases may indicate market uncertainty</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-1 h-1 rounded-full bg-primary mt-1 shrink-0" />
                    <span>Traders often compare last 6–12 months for seasonal bias</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
