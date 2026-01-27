import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";
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
}

interface PinState {
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

interface ReportsSessionsProps {
  trades: Trade[];
  dateRangeLabel: string;
  isLocked?: boolean;
  pinStates?: {
    comparison: PinState;
    recommendations: PinState;
  };
}

export function ReportsSessions({ trades, dateRangeLabel, pinStates, isLocked = false }: ReportsSessionsProps) {
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
    exportToPdf('reports-sessions', {
      filename: `StreamBias-Sessions-${new Date().toISOString().split('T')[0]}`,
      title: 'Sessions Report',
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

  // Session performance data (placeholder - would need trade timestamps)
  const sessionData = [
    { 
      name: 'London', 
      winRate: 71, 
      pnl: 8450, 
      avgRR: 2.3, 
      trades: 45,
      hours: '08:00 - 16:00 GMT'
    },
    { 
      name: 'New York', 
      winRate: 65, 
      pnl: 5200, 
      avgRR: 1.9, 
      trades: 38,
      hours: '13:00 - 21:00 GMT'
    },
    { 
      name: 'Asian', 
      winRate: 58, 
      pnl: 1850, 
      avgRR: 1.5, 
      trades: 22,
      hours: '00:00 - 08:00 GMT'
    },
  ];

  const strongest = sessionData.reduce((best, s) => 
    s.pnl > best.pnl ? s : best, sessionData[0]);
  const weakest = sessionData.reduce((worst, s) => 
    s.pnl < worst.pnl ? s : worst, sessionData[0]);

  const chartData = sessionData.map(s => ({
    name: s.name,
    winRate: s.winRate,
    pnl: s.pnl,
    avgRR: s.avgRR * 100, // scale for visibility
  }));

  return (
    <div id="reports-sessions" className="space-y-6">
      {/* Header with export */}
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Session Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sessionData.map((session) => (
          <Card 
            key={session.name}
            className={session.name === strongest.name ? 'border-success/50 bg-success/5' : ''}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{session.name} Session</CardTitle>
                <div className="flex items-center gap-1.5">
                  {isLocked && <TierBadge requiredPlan="standard" />}
                  {session.name === strongest.name && !isLocked && (
                    <Badge className="bg-success/20 text-success text-xs">Strongest</Badge>
                  )}
                  {session.name === weakest.name && !isLocked && (
                    <Badge variant="destructive" className="text-xs">Weakest</Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{session.hours}</p>
            </CardHeader>
            <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="text-lg font-bold text-foreground">{session.winRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total P&L</p>
                    <p className={`text-lg font-bold ${session.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {session.pnl >= 0 ? '+' : ''}£{session.pnl.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg R:R</p>
                    <p className="text-lg font-bold text-foreground">{session.avgRR}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trades</p>
                    <p className="text-lg font-bold text-foreground">{session.trades}</p>
                  </div>
                </div>
              </CardContent>
            </CardFeatureGate>
          </Card>
        ))}
      </div>

      {/* Comparison Chart - with per-card pin */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Session Performance Comparison</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.comparison && (
                <AddToDashboardButton
                  isAdded={pinStates.comparison.isAdded}
                  onAdd={pinStates.comparison.onAdd}
                  onRemove={pinStates.comparison.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'winRate') return [`${value}%`, 'Win Rate'];
                      if (name === 'pnl') return [`£${value.toLocaleString()}`, 'P&L'];
                      if (name === 'avgRR') return [`${(value / 100).toFixed(1)}`, 'Avg R:R'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="winRate" name="winRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* P&L by Session */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>P&L by Session</CardTitle>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`£${value.toLocaleString()}`, 'P&L']}
                  />
                  <Bar dataKey="pnl" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Recommendations - with per-card pin */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Session Recommendations</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.recommendations && (
                <AddToDashboardButton
                  isAdded={pinStates.recommendations.isAdded}
                  onAdd={pinStates.recommendations.onAdd}
                  onRemove={pinStates.recommendations.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border-success/30 bg-success/5 border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <p className="text-base font-medium">Recommended to Trade More</p>
                </div>
                <p className="text-sm text-foreground font-medium">{strongest.name} Session</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your highest win rate ({strongest.winRate}%) and best P&L (£{strongest.pnl.toLocaleString()}).
                  Consider increasing position sizes during this session.
                </p>
              </div>

              <div className="p-4 rounded-lg border-destructive/30 bg-destructive/5 border">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <p className="text-base font-medium">Consider Reducing Exposure</p>
                </div>
                <p className="text-sm text-foreground font-medium">{weakest.name} Session</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lowest win rate ({weakest.winRate}%) and P&L (£{weakest.pnl.toLocaleString()}).
                  Review your setups for this session or reduce size.
                </p>
              </div>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>
    </div>
  );
}
