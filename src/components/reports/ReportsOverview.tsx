import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Target, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";

interface Trade {
  id: string;
  date: string;
  pair: string;
  type: 'Long' | 'Short';
  entry: number;
  exit: number;
  lots: number;
  pnl: number;
  status: string;
  notes?: string;
  rating?: number;
}

interface ReportsOverviewProps {
  trades: Trade[];
  dateRangeLabel: string;
}

export function ReportsOverview({ trades, dateRangeLabel }: ReportsOverviewProps) {
  const { exportToPdf } = usePdfExport();
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
    : 0;
  const avgLoss = losingTrades.length > 0 
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
    : 1;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;
  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

  // Group by date for best/worst day
  const dailyPnl = trades.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] || 0) + t.pnl;
    return acc;
  }, {} as Record<string, number>);

  const dailyEntries = Object.entries(dailyPnl);
  const bestDay = dailyEntries.reduce((best, [date, pnl]) => 
    pnl > (best?.pnl || -Infinity) ? { date, pnl } : best, 
    null as { date: string; pnl: number } | null
  );
  const worstDay = dailyEntries.reduce((worst, [date, pnl]) => 
    pnl < (worst?.pnl || Infinity) ? { date, pnl } : worst, 
    null as { date: string; pnl: number } | null
  );

  // Equity curve data
  const sortedTrades = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let cumulative = 0;
  const equityData = sortedTrades.map(t => {
    cumulative += t.pnl;
    return { date: t.date, equity: cumulative };
  });

  // Rolling 30-day data (simplified)
  const rollingData = equityData.slice(-30).map((d, i) => ({
    day: i + 1,
    pnl: d.equity,
  }));

  // Best edge detection
  const ratedTrades = trades.filter(t => t.rating && t.rating >= 4 && t.pnl > 0);
  const bestEdge = ratedTrades.length > 0 
    ? "High-confidence setups with 4+ star ratings" 
    : "Build more trade history to identify your edge";

  const handleExportOverview = () => {
    exportToPdf('reports-overview', {
      filename: `StreamBias-Overview-${new Date().toISOString().split('T')[0]}`,
      title: 'Overview Report',
      dateRange: dateRangeLabel,
    });
  };

  return (
    <div id="reports-overview" className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
              <PdfExportButton onClick={handleExportOverview} data-pdf-exclude />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnl >= 0 ? '+' : ''}£{totalPnl.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg R:R</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{avgRR.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{winRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expectancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${expectancy >= 0 ? 'text-success' : 'text-destructive'}`}>
              £{expectancy.toFixed(0)}/trade
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best/Worst Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Best Winning Day</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              +£{bestDay?.pnl?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{bestDay?.date || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Worst Losing Day</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              £{worstDay?.pnl?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{worstDay?.date || 'N/A'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, 'Equity']}
                />
                <Area 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Rolling 30-Day */}
      <Card>
        <CardHeader>
          <CardTitle>Rolling 30-Day Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rollingData}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, 'Cumulative P&L']}
                />
                <Area 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="hsl(var(--success))" 
                  fill="hsl(var(--success))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Strongest Edge Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle>Your Strongest Edge This Month</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{bestEdge}</p>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className="text-xs">Based on ratings</Badge>
            <Badge variant="outline" className="text-xs">P&L consistency</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
