import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Star, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
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

interface ReportsSetupQualityProps {
  trades: Trade[];
  dateRangeLabel: string;
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}

const KEYWORDS = ['late entry', 'fear', 'hesitation', 'fomo', 'missed level', 'early exit', 'overtrading', 'revenge', 'perfect', 'patient'];

export function ReportsSetupQuality({ trades, dateRangeLabel, isAdded, onAdd, onRemove }: ReportsSetupQualityProps) {
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
    exportToPdf('reports-setup', {
      filename: `StreamBias-SetupQuality-${new Date().toISOString().split('T')[0]}`,
      title: 'Setup Quality Report',
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
  // Group by rating
  const ratingGroups = [1, 2, 3, 4, 5].map(rating => {
    const ratedTrades = trades.filter(t => t.rating === rating);
    const wins = ratedTrades.filter(t => t.pnl > 0).length;
    const winRate = ratedTrades.length > 0 ? (wins / ratedTrades.length) * 100 : 0;
    const totalPnl = ratedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnl = ratedTrades.length > 0 ? totalPnl / ratedTrades.length : 0;
    const expectancy = winRate / 100 * avgPnl;
    
    return {
      rating: `${rating} Star`,
      ratingNum: rating,
      trades: ratedTrades.length,
      winRate: Math.round(winRate),
      totalPnl,
      avgPnl: Math.round(avgPnl),
      expectancy: Math.round(expectancy),
    };
  });

  const unratedTrades = trades.filter(t => !t.rating || t.rating === 0);
  const unratedStats = {
    rating: 'Unrated',
    ratingNum: 0,
    trades: unratedTrades.length,
    winRate: unratedTrades.length > 0 ? Math.round((unratedTrades.filter(t => t.pnl > 0).length / unratedTrades.length) * 100) : 0,
    totalPnl: unratedTrades.reduce((sum, t) => sum + t.pnl, 0),
    avgPnl: unratedTrades.length > 0 ? Math.round(unratedTrades.reduce((sum, t) => sum + t.pnl, 0) / unratedTrades.length) : 0,
    expectancy: 0,
  };

  const allSetups = [...ratingGroups, unratedStats].filter(s => s.trades > 0);
  
  const bestSetup = ratingGroups.filter(s => s.trades > 0).reduce((best, s) => 
    s.expectancy > (best?.expectancy || -Infinity) ? s : best, ratingGroups[0]);
  const worstSetup = ratingGroups.filter(s => s.trades > 0).reduce((worst, s) => 
    s.expectancy < (worst?.expectancy || Infinity) ? s : worst, ratingGroups[0]);

  // Keyword extraction from notes
  const keywordCounts = KEYWORDS.reduce((acc, kw) => {
    const count = trades.filter(t => t.notes?.toLowerCase().includes(kw)).length;
    if (count > 0) acc.push({ keyword: kw, count });
    return acc;
  }, [] as { keyword: string; count: number }[]).sort((a, b) => b.count - a.count);

  // Performance over time by rating
  const timeData = trades
    .filter(t => t.rating && t.rating >= 4)
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((acc, t, i) => {
      const prev = acc[acc.length - 1]?.cumPnl || 0;
      acc.push({ trade: i + 1, cumPnl: prev + t.pnl, date: t.date });
      return acc;
    }, [] as { trade: number; cumPnl: number; date: string }[]);

  return (
    <div id="reports-setup" className="space-y-6">
      {/* Header with export and pin */}
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        {isAdded !== undefined && onAdd && onRemove && (
          <AddToDashboardButton isAdded={isAdded} onAdd={onAdd} onRemove={onRemove} />
        )}
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Best & Worst Setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <CardTitle className="text-base">Best Setup</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex">
                {[...Array(bestSetup?.ratingNum || 0)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {bestSetup?.trades || 0} trades
              </span>
            </div>
            <p className="text-2xl font-bold text-success mt-2">
              £{bestSetup?.expectancy?.toLocaleString() || 0}/trade expectancy
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {bestSetup?.winRate || 0}% win rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">Worst Setup</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex">
                {[...Array(worstSetup?.ratingNum || 0)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {worstSetup?.trades || 0} trades
              </span>
            </div>
            <p className="text-2xl font-bold text-destructive mt-2">
              £{worstSetup?.expectancy?.toLocaleString() || 0}/trade expectancy
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {worstSetup?.winRate || 0}% win rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Setup Performance by Rating */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Performance by Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allSetups}>
                <XAxis dataKey="rating" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'expectancy') return [`£${value}`, 'Expectancy'];
                    if (name === 'winRate') return [`${value}%`, 'Win Rate'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="expectancy" name="expectancy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Rating</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Trades</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Win Rate</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Total P&L</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Avg P&L</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Expectancy</th>
                </tr>
              </thead>
              <tbody>
                {allSetups.map((s) => (
                  <tr key={s.rating} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        {s.ratingNum > 0 ? (
                          [...Array(s.ratingNum)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Unrated</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-foreground">{s.trades}</td>
                    <td className="py-3 px-3 text-sm text-foreground">{s.winRate}%</td>
                    <td className="py-3 px-3">
                      <span className={`text-sm font-medium ${s.totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {s.totalPnl >= 0 ? '+' : ''}£{s.totalPnl.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-sm ${s.avgPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        £{s.avgPnl}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-sm font-medium ${s.expectancy >= 0 ? 'text-success' : 'text-destructive'}`}>
                        £{s.expectancy}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes Keyword Extraction */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle>Common Patterns in Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {keywordCounts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {keywordCounts.map((kw) => (
                <Badge 
                  key={kw.keyword} 
                  variant="secondary"
                  className="text-sm px-3 py-1"
                >
                  {kw.keyword} ({kw.count})
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add notes to your trades to identify patterns like "late entry", "fear", "hesitation", etc.
            </p>
          )}
        </CardContent>
      </Card>

      {/* High-Rated Setup Performance Over Time */}
      {timeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>4-5 Star Setup Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeData}>
                  <XAxis dataKey="trade" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`£${value.toLocaleString()}`, 'Cumulative P&L']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumPnl" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
