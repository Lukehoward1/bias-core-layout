import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";
import { StrategySession } from "@/types/strategySession";
import { MiniEquityCurve } from "./MiniEquityCurve";

interface SessionComparisonProps {
  sessions: StrategySession[];
  onBack: () => void;
}

export function SessionComparison({ sessions, onBack }: SessionComparisonProps) {
  const metrics = [
    { key: 'netProfit', label: 'Net Profit', format: (v: number) => `$${v >= 0 ? '+' : ''}${v.toLocaleString()}`, colorize: true },
    { key: 'winRate', label: 'Win Rate', format: (v: number) => `${v}%` },
    { key: 'avgRR', label: 'Avg R:R', format: (v: number) => v.toFixed(2) },
    { key: 'maxDrawdown', label: 'Max Drawdown', format: (v: number) => `${v}%`, negative: true },
    { key: 'expectancy', label: 'Expectancy', format: (v: number) => `$${v.toFixed(2)}`, colorize: true },
    { key: 'profitFactor', label: 'Profit Factor', format: (v: number) => v.toFixed(2) },
    { key: 'totalTrades', label: 'Total Trades', format: (v: number) => v.toString() },
  ];

  const getBestValue = (key: string) => {
    const values = sessions.map(s => s.metrics[key as keyof typeof s.metrics] as number);
    if (key === 'maxDrawdown') {
      return Math.min(...values);
    }
    return Math.max(...values);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">Compare Sessions</h2>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Session Headers */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${sessions.length}, 1fr)` }}>
            {sessions.map((session) => (
              <div key={session.id} className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="font-medium text-sm truncate">{session.name}</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {session.pair.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {session.timeframe.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Equity Curves */}
          <div>
            <h3 className="text-sm font-medium mb-3">Equity Curves</h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${sessions.length}, 1fr)` }}>
              {sessions.map((session) => (
                <div key={session.id} className="bg-muted/30 rounded-lg p-3">
                  <MiniEquityCurve data={session.equityCurve} height={80} />
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Comparison */}
          <div>
            <h3 className="text-sm font-medium mb-3">Metrics</h3>
            <div className="space-y-2">
              {metrics.map((metric) => {
                const bestValue = getBestValue(metric.key);
                return (
                  <div key={metric.key} className="grid gap-3 items-center" style={{ gridTemplateColumns: `120px repeat(${sessions.length}, 1fr)` }}>
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                    {sessions.map((session) => {
                      const value = session.metrics[metric.key as keyof typeof session.metrics] as number;
                      const isBest = value === bestValue;
                      return (
                        <div
                          key={session.id}
                          className={`text-center p-2 rounded-lg text-sm font-medium ${
                            isBest ? 'bg-primary/10 text-primary' : 'bg-muted/30'
                          } ${metric.colorize && value >= 0 ? 'text-success' : ''} ${
                            metric.colorize && value < 0 ? 'text-destructive' : ''
                          } ${metric.negative ? 'text-destructive' : ''}`}
                        >
                          {metric.format(value)}
                          {isBest && <span className="ml-1 text-xs">★</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trade Distribution */}
          <div>
            <h3 className="text-sm font-medium mb-3">Trade Distribution</h3>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${sessions.length}, 1fr)` }}>
              {sessions.map((session) => (
                <div key={session.id} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">W/L Ratio</span>
                    <span className="text-xs font-medium">
                      <span className="text-success">{session.metrics.winningTrades}</span>
                      /
                      <span className="text-destructive">{session.metrics.losingTrades}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success"
                      style={{ width: `${session.metrics.winRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
