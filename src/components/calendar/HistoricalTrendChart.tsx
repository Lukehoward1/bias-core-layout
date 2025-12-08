import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";

// Mock historical data for demo
const historicalData = [
  { period: "Jan 23", actual: 185 },
  { period: "Feb 23", actual: 225 },
  { period: "Mar 23", actual: 165 },
  { period: "Apr 23", actual: 253 },
  { period: "May 23", actual: 281 },
  { period: "Jun 23", actual: 209 },
  { period: "Jul 23", actual: 187 },
  { period: "Aug 23", actual: 227 },
  { period: "Sep 23", actual: 336 },
  { period: "Oct 23", actual: 150 },
  { period: "Nov 23", actual: 199 },
  { period: "Dec 23", actual: null, forecast: 190 }, // Upcoming with forecast
];

// Calculate max value for scaling
const maxValue = Math.max(...historicalData.map(d => d.actual || d.forecast || 0));

export function HistoricalTrendChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Historical Trend (demo)</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Annual performance trend based on previous releases (demo)
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Chart Container - Scrollable on mobile */}
        <div className="overflow-x-auto -mx-5 px-5">
          <div className="min-w-[600px]">
            {/* Grid background */}
            <div className="relative h-48 border-l border-b border-border/50">
              {/* Horizontal grid lines */}
              {[0, 25, 50, 75, 100].map((percent) => (
                <div
                  key={percent}
                  className="absolute left-0 right-0 border-t border-border/30"
                  style={{ bottom: `${percent}%` }}
                >
                  {percent > 0 && (
                    <span className="absolute -left-1 -translate-x-full text-[10px] text-muted-foreground -translate-y-1/2">
                      {Math.round((maxValue * percent) / 100)}K
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
                      {/* Bar */}
                      <div
                        className={`w-full max-w-[40px] rounded-t transition-all duration-300 ${
                          isForecast
                            ? "border-2 border-dashed border-primary/60 bg-primary/10"
                            : "bg-primary hover:bg-primary/80"
                        }`}
                        style={{ height: `${heightPercent}%`, minHeight: value > 0 ? "4px" : "0" }}
                        title={`${item.period}: ${value}K${isForecast ? " (Forecast)" : ""}`}
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
                  <span className={`text-[10px] ${item.actual === null ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {item.period}
                  </span>
                  {item.actual === null && (
                    <div className="text-[8px] text-primary/70 mt-0.5">Forecast</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="text-xs text-muted-foreground">Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm border-2 border-dashed border-primary/60 bg-primary/10" />
            <span className="text-xs text-muted-foreground">Forecast (demo)</span>
          </div>
        </div>
        
        {/* Interpretation bullets */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">How to interpret</span>
          </div>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
              <span>Rising trend indicates strengthening labour or economic performance</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
              <span>Large deviations between releases may indicate market uncertainty</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
              <span>Traders often compare last 6–12 months for seasonal bias</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
