import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, parseISO, getDay } from "date-fns";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { CardFeatureGate, TierBadge } from "@/components/journal/FeatureGate";

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
  entryTime?: string;
  exitTime?: string;
}

interface PinState {
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

interface ReportsPerformanceProps {
  trades: Trade[];
  dateRangeLabel: string;
  isLocked?: boolean;
  sym?: string;
  pinStates?: {
    byDay: PinState;
    distribution: PinState;
  };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ReportsPerformance({ trades, dateRangeLabel, pinStates, isLocked = false, sym = '£' }: ReportsPerformanceProps) {
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
    const winRateVal = dayTrades.length > 0 ? (wins / dayTrades.length) * 100 : 0;
    return { day, winRate: Math.round(winRateVal), trades: dayTrades.length };
  });

  // Trade distribution Long/Short
  const longTrades = trades.filter(t => t.type === 'Long');
  const shortTrades = trades.filter(t => t.type === 'Short');
  const distributionData = [
    { name: 'Long', value: longTrades.length, fill: 'hsl(var(--success))' },
    { name: 'Short', value: shortTrades.length, fill: 'hsl(var(--destructive))' },
  ];

  // Hold time from entryTime + exitTime — same logic as ReportsPsychology
  const timedTrades = trades
    .filter(t => t.entryTime && t.exitTime)
    .map(t => {
      const [eh, em] = t.entryTime!.split(':').map(Number);
      const [xh, xm] = t.exitTime!.split(':').map(Number);
      const entryMins = eh * 60 + em;
      let exitMins = xh * 60 + xm;
      if (exitMins < entryMins) exitMins += 24 * 60;
      return { ...t, holdMins: exitMins - entryMins };
    });

  const hasHoldData = timedTrades.length > 0;

  const holdWinners = timedTrades.filter(t => t.pnl > 0);
  const holdLosers  = timedTrades.filter(t => t.pnl < 0);
  const avgHoldWinnersH = holdWinners.length > 0
    ? parseFloat((holdWinners.reduce((s, t) => s + t.holdMins, 0) / holdWinners.length / 60).toFixed(1))
    : 0;
  const avgHoldLosersH = holdLosers.length > 0
    ? parseFloat((holdLosers.reduce((s, t) => s + t.holdMins, 0) / holdLosers.length / 60).toFixed(1))
    : 0;

  const holdTimeData = [
    { type: 'Winners', avgHours: avgHoldWinnersH },
    { type: 'Losers',  avgHours: avgHoldLosersH  },
  ];

  // P&L by duration buckets from real hold times
  const durationBuckets = [
    { duration: 'Scalp (<1h)',      min: 0,   max: 59   },
    { duration: 'Intraday (1-8h)', min: 60,  max: 480  },
    { duration: 'Swing (>8h)',     min: 481, max: Infinity },
  ];

  const durationPnl = durationBuckets.map(b => {
    const bucket = timedTrades.filter(t => t.holdMins >= b.min && t.holdMins <= b.max);
    return {
      duration: b.duration,
      pnl: Math.round(bucket.reduce((s, t) => s + t.pnl, 0)),
      trades: bucket.length,
    };
  });

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
      {/* Header with export */}
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Profit Rate by Day - with per-card pin */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Profit Rate by Day of Week</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.byDay && (
                <AddToDashboardButton
                  isAdded={pinStates.byDay.isAdded}
                  onAdd={pinStates.byDay.onAdd}
                  onRemove={pinStates.byDay.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
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
                    formatter={(value: number) => [`${value}%`, 'Profit Rate']}
                    labelFormatter={(label) => `${label} (${dayStats.find(d => d.day === label)?.trades || 0} trades)`}
                  />
                  <Bar dataKey="winRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Trade Distribution - with per-card pin */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trade Distribution (Long/Short)</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.distribution && (
                <AddToDashboardButton
                  isAdded={pinStates.distribution.isAdded}
                  onAdd={pinStates.distribution.onAdd}
                  onRemove={pinStates.distribution.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
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
        </CardFeatureGate>
      </Card>

      {/* Average Hold Time */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Average Hold Time: Winners vs Losers</CardTitle>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {!hasHoldData ? (
              <p className="text-sm text-muted-foreground">
                Add entry and exit times to your trades to see hold-time analysis.
              </p>
            ) : (
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
                      formatter={(value: number) => [`${value}h`, 'Avg Hold Time']}
                    />
                    <Bar dataKey="avgHours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* P&L by Trade Duration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>P&L by Trade Duration</CardTitle>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {!hasHoldData ? (
              <p className="text-sm text-muted-foreground">
                Add entry and exit times to your trades to see duration breakdown.
              </p>
            ) : (
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
                        if (name === 'pnl') return [`${sym}${value.toLocaleString()}`, 'P&L'];
                        return [value, 'Trades'];
                      }}
                    />
                    <Bar dataKey="pnl" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Monthly Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monthly Performance Heatmap</CardTitle>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
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
                    {m.pnl >= 0 ? '+' : ''}{sym}{m.pnl.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.trades} trades</p>
                </div>
              ))}
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>
    </div>
  );
}
