import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Info, RefreshCw } from "lucide-react";

export interface ChartDataPoint {
  period: string;
  actual: number | null;
  forecast?: number;
}

interface HistoricalTrendChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
}

export function HistoricalTrendChart({ data, isLoading = false }: HistoricalTrendChartProps) {
  const pastPoints = data.filter((d) => d.actual !== null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Historical Trend</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Performance trend based on previous releases</p>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading historical data…</span>
          </div>
        ) : pastPoints.length < 2 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Not enough historical data to display a trend yet.
          </p>
        ) : (
          <ChartBody data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function ChartBody({ data }: { data: ChartDataPoint[] }) {
  // Collect all numeric values (actual + forecast) to find the display range.
  // Using min/max normalisation so negative values (e.g. EIA Crude, factory orders)
  // render as proper relative bars instead of zero-height or overflow.
  const allValues: number[] = [];
  for (const d of data) {
    if (d.actual !== null) allValues.push(d.actual);
    if (d.forecast !== undefined) allValues.push(d.forecast);
  }

  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = Math.max(maxVal - minVal, 0.001); // prevent divide-by-zero

  function heightPercent(v: number): number {
    return Math.max(((v - minVal) / range) * 100, v !== minVal ? 2 : 0);
  }

  return (
    <>
      {/* Scrollable chart area */}
      <div className="overflow-x-auto -mx-5 px-5">
        <div className="min-w-[600px]">
          {/* Grid + bars */}
          <div className="relative h-48 border-l border-b border-border/50">
            {/* Horizontal grid lines */}
            {[0, 25, 50, 75, 100].map((pct) => {
              const labelVal = minVal + (range * pct) / 100;
              return (
                <div
                  key={pct}
                  className="absolute left-0 right-0 border-t border-border/30"
                  style={{ bottom: `${pct}%` }}
                >
                  {pct > 0 && (
                    <span className="absolute -left-1 -translate-x-full text-[10px] text-muted-foreground -translate-y-1/2">
                      {formatAxisLabel(labelVal)}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Bars */}
            <div className="absolute inset-0 flex items-end justify-between gap-2 px-2 pb-0">
              {data.map((item, index) => {
                const value = item.actual ?? item.forecast ?? minVal;
                const h = heightPercent(value);
                const isForecast = item.actual === null;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full max-w-[40px] rounded-t transition-all duration-300 ${
                        isForecast
                          ? "border-2 border-dashed border-primary/60 bg-primary/10"
                          : "bg-primary hover:bg-primary/80"
                      }`}
                      style={{ height: `${h}%`, minHeight: h > 0 ? "4px" : "0" }}
                      title={`${item.period}: ${value}${isForecast ? " (Forecast)" : ""}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between gap-2 px-2 mt-2">
            {data.map((item, index) => (
              <div key={index} className="flex-1 text-center">
                <span
                  className={`text-[10px] ${item.actual === null ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
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
          <span className="text-xs text-muted-foreground">Forecast</span>
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
    </>
  );
}

// Format axis labels sensibly for different value scales
function formatAxisLabel(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  // Show decimals for small values (rates, percentages)
  if (abs < 10) return v.toFixed(2);
  return v.toFixed(0);
}
