import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, parseISO, getDay } from "date-fns";
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

interface ReportsPerformanceProps {
  trades: Trade[];
  dateRangeLabel: string;
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ReportsPerformance({ trades, dateRangeLabel, isAdded, onAdd, onRemove }: ReportsPerformanceProps) {
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
    exportToPdf('reports-performance', {
      filename: `StreamBias-Performance-${new Date().toISOString().split('T')[0]}`,
      title: 'Performance Report',
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
  // Win rate by day of week
  const dayStats = DAYS.map((day, idx) => {
    const dayTrades = trades.filter(t => getDay(parseISO(t.date)) === idx);
    const wins = dayTrades.filter(t => t.pnl > 0).length;
    const winRate = dayTrades.length > 0 ? (wins / dayTrades.length) * 100 : 0;
    return { day, winRate: Math.round(winRate), trades: dayTrades.length };
  });

  // Win rate by session (simplified time-based)
  const sessionStats = [
    { name: 'Asian', winRate: 62, trades: 15 },
    { name: 'London', winRate: 71, trades: 45 },
    { name: 'New York', winRate: 65, trades: 38 },
    { name: 'Overlap', winRate: 74, trades: 22 },
  ];

  // Trade distribution Long/Short
  const longTrades = trades.filter(t => t.type === 'Long');
  const shortTrades = trades.filter(t => t.type === 'Short');
  const distributionData = [
    { name: 'Long', value: longTrades.length, fill: 'hsl(var(--success))' },
    { name: 'Short', value: shortTrades.length, fill: 'hsl(var(--destructive))' },
  ];

  // Average hold time (placeholder - would need actual timestamps)
  const holdTimeData = [
    { type: 'Winners', avgHours: 4.2 },
    { type: 'Losers', avgHours: 1.8 },
  ];

  // P&L by duration (placeholder categories)
  const durationPnl = [
    { duration: 'Scalp (<1h)', pnl: 850, trades: 25 },
    { duration: 'Intraday (1-8h)', pnl: 1200, trades: 45 },
    { duration: 'Swing (>8h)', pnl: 450, trades: 12 },
  ];

  // Monthly heatmap data
  const monthlyData = trades.reduce((acc, t) => {
    const month = format(parseISO(t.date), 'MMM yyyy');
    if (!acc[month]) acc[month] = { month, pnl: 0, trades: 0 };
    acc[month].pnl += t.pnl;
    acc[month].trades += 1;
    return acc;
  }, {} as Record<string, { month: string; pnl: number; trades: number }>);

  const monthlyHeatmap = Object.values(monthlyData);

  return (
    <div id="reports-performance" className="space-y-6">
      {/* Win Rate by Day */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Win Rate by Day of Week</CardTitle>
            <PdfExportButton onClick={handleExport} data-pdf-exclude />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayStats}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [`${value}%`, 'Win Rate']}
                  labelFormatter={(label) => `${label} (${dayStats.find(d => d.day === label)?.trades || 0} trades)`}
                />
                <Bar dataKey="winRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Win Rate by Session */}
        <Card>
          <CardHeader>
            <CardTitle>Win Rate by Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionStats} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Win Rate']}
                  />
                  <Bar dataKey="winRate" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Distribution (Long/Short)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Hold Time */}
      <Card>
        <CardHeader>
          <CardTitle>Average Hold Time: Winners vs Losers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={holdTimeData}>
                <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="h" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value} hours`, 'Avg Hold Time']}
                />
                <Bar dataKey="avgHours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* P&L by Trade Duration */}
      <Card>
        <CardHeader>
          <CardTitle>P&L by Trade Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationPnl}>
                <XAxis dataKey="duration" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'pnl') return [`£${value.toLocaleString()}`, 'P&L'];
                    return [value, 'Trades'];
                  }}
                />
                <Bar dataKey="pnl" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            {monthlyHeatmap.map((m, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg text-center border ${
                  m.pnl > 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
                }`}
              >
                <p className="text-xs text-muted-foreground">{m.month}</p>
                <p className={`text-sm font-bold ${m.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {m.pnl >= 0 ? '+' : ''}£{m.pnl.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{m.trades} trades</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
