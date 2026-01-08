import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Star, Target } from "lucide-react";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";

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

interface ReportsAssetsProps {
  trades: Trade[];
  dateRangeLabel: string;
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}

export function ReportsAssets({ trades, dateRangeLabel, isAdded, onAdd, onRemove }: ReportsAssetsProps) {
  const { exportToPdf } = usePdfExport();

  // Calculate summary stats
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 1;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  const handleExport = () => {
    exportToPdf('reports-assets', {
      filename: `StreamBias-Assets-${new Date().toISOString().split('T')[0]}`,
      title: 'Assets Report',
      dateRange: dateRangeLabel,
      userName: 'John Trader',
      trades: {
        totalPnl,
        winRate,
        avgRR,
        tradeCount: trades.length,
        bestDay: null,
        worstDay: null,
      },
    });
  };
  // Group trades by pair
  const pairStats = trades.reduce((acc, t) => {
    if (!acc[t.pair]) {
      acc[t.pair] = { pair: t.pair, pnl: 0, wins: 0, losses: 0, totalRR: 0, ratings: [], notes: [] };
    }
    acc[t.pair].pnl += t.pnl;
    if (t.pnl > 0) acc[t.pair].wins++;
    else if (t.pnl < 0) acc[t.pair].losses++;
    if (t.rating) acc[t.pair].ratings.push(t.rating);
    if (t.notes) acc[t.pair].notes.push(t.notes);
    return acc;
  }, {} as Record<string, { pair: string; pnl: number; wins: number; losses: number; totalRR: number; ratings: number[]; notes: string[] }>);

  const pairData = Object.values(pairStats).map(p => ({
    ...p,
    trades: p.wins + p.losses,
    winRate: p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0,
    avgRating: p.ratings.length > 0 ? (p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length).toFixed(1) : 'N/A',
    avgRR: p.wins > 0 ? ((p.pnl / p.wins) / 100).toFixed(1) : '0',
    confidence: p.ratings.length > 0 ? Math.round((p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length) * 20) : 50,
  })).sort((a, b) => b.pnl - a.pnl);

  const bestPair = pairData[0];
  const worstPair = pairData[pairData.length - 1];

  const chartData = pairData.slice(0, 8).map(p => ({
    pair: p.pair,
    pnl: p.pnl,
    winRate: p.winRate,
  }));

  return (
    <div id="reports-assets" className="space-y-6">
      {/* Header with export and pin */}
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        {isAdded !== undefined && onAdd && onRemove && (
          <AddToDashboardButton isAdded={isAdded} onAdd={onAdd} onRemove={onRemove} />
        )}
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Top Insight Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Your Most Profitable Pair This Month</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className="text-lg px-3 py-1">{bestPair?.pair || 'N/A'}</Badge>
            <span className="text-2xl font-bold text-success">
              +£{bestPair?.pnl?.toLocaleString() || 0}
            </span>
            <span className="text-sm text-muted-foreground">
              ({bestPair?.trades || 0} trades, {bestPair?.winRate || 0}% win rate)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* P&L by Pair Chart */}
      <Card>
        <CardHeader>
          <CardTitle>P&L by Instrument</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="pair" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, 'P&L']}
                />
                <Bar 
                  dataKey="pnl" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Best & Worst Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <CardTitle className="text-base">Best Performing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pairData.slice(0, 3).map((p, idx) => (
                <div key={p.pair} className="flex items-center justify-between p-2 rounded-lg bg-success/5 border border-success/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    <Badge variant="outline">{p.pair}</Badge>
                  </div>
                  <span className="text-sm font-bold text-success">+£{p.pnl.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base">Worst Performing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pairData.slice(-3).reverse().map((p, idx) => (
                <div key={p.pair} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    <Badge variant="outline">{p.pair}</Badge>
                  </div>
                  <span className={`text-sm font-bold ${p.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {p.pnl >= 0 ? '+' : ''}£{p.pnl.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Instrument Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Pair</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Trades</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Win Rate</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">P&L</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Avg Rating</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {pairData.map((p) => (
                  <tr key={p.pair} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-3">
                      <Badge variant="outline">{p.pair}</Badge>
                    </td>
                    <td className="py-3 px-3 text-sm text-foreground">{p.trades}</td>
                    <td className="py-3 px-3 text-sm text-foreground">{p.winRate}%</td>
                    <td className="py-3 px-3">
                      <span className={`text-sm font-medium ${p.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {p.pnl >= 0 ? '+' : ''}£{p.pnl.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm">{p.avgRating}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${p.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{p.confidence}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
