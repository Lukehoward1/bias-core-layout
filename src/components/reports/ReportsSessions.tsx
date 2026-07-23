import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { CardFeatureGate, TierBadge } from "@/components/journal/FeatureGate";
import { getAccountColor, shortAccountName } from "@/lib/account-colors";
import { currencySymbol } from "@/lib/currency";
import type { LinkedAccount } from "@/hooks/use-linked-accounts";

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

interface AccountTrades {
  account: LinkedAccount;
  trades: Trade[];
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
  sym?: string;
  pinStates?: {
    comparison: PinState;
    recommendations: PinState;
  };
  tradesByAccount?: AccountTrades[];
  combineMode?: boolean;
  canCombine?: boolean;
}

const SESSION_DEFS = [
  { name: 'Asia',        hours: '00:00 – 06:59 UTC', min: 0,  max: 6  },
  { name: 'London',      hours: '07:00 – 11:59 UTC', min: 7,  max: 11 },
  { name: 'Overlap',     hours: '12:00 – 15:59 UTC', min: 12, max: 15 },
  { name: 'New York',    hours: '16:00 – 20:59 UTC', min: 16, max: 20 },
  { name: 'Sydney/Late', hours: '21:00 – 23:59 UTC', min: 21, max: 23 },
];

function buildSessionStats(ts: Trade[]) {
  const timedTrades = ts.filter(t => t.entryTime);
  return SESSION_DEFS.map(def => {
    const sessionTrades = timedTrades.filter(t => {
      const hour = parseInt(t.entryTime!.split(':')[0], 10);
      return hour >= def.min && hour <= def.max;
    });
    const wins = sessionTrades.filter(t => t.pnl > 0);
    const losses = sessionTrades.filter(t => t.pnl < 0);
    const pnl = sessionTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgWinVal = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLossVal = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1;
    return {
      name: def.name,
      hours: def.hours,
      trades: sessionTrades.length,
      pnl,
      winRate: sessionTrades.length > 0 ? Math.round((wins.length / sessionTrades.length) * 100) : 0,
      avgRR: parseFloat((avgLossVal > 0 ? avgWinVal / avgLossVal : 0).toFixed(1)),
    };
  }).filter(s => s.trades > 0);
}

export function ReportsSessions({ trades, dateRangeLabel, pinStates, isLocked = false, sym = '£', tradesByAccount, combineMode, canCombine }: ReportsSessionsProps) {
  const { exportToPdf } = usePdfExport();

  const isMultiAccountMode = (tradesByAccount?.length ?? 0) > 1 && !(combineMode && canCombine);

  const accountSymByName = Object.fromEntries(
    (tradesByAccount ?? []).map(({ account }) => [account.name, currencySymbol(account.currency)])
  );

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

  // Single-account path
  const timedTrades = trades.filter(t => t.entryTime);
  const hasTimeData = timedTrades.length > 0;
  const sessionData = buildSessionStats(trades);

  const strongest = sessionData.length > 0
    ? sessionData.reduce((best, s) => s.pnl > best.pnl ? s : best, sessionData[0])
    : null;
  const weakest = sessionData.length > 0
    ? sessionData.reduce((worst, s) => s.pnl < worst.pnl ? s : worst, sessionData[0])
    : null;

  const chartData = sessionData.map(s => ({
    name: s.name,
    winRate: s.winRate,
    pnl: s.pnl,
    avgRR: s.avgRR * 100,
  }));

  // Multi-account path
  const perAccountSessions = (tradesByAccount ?? []).map(({ account, trades: ts }) => {
    const stats = buildSessionStats(ts);
    const str = stats.length > 0 ? stats.reduce((b, s) => s.pnl > b.pnl ? s : b, stats[0]) : null;
    const wk  = stats.length > 0 ? stats.reduce((w, s) => s.pnl < w.pnl ? s : w, stats[0]) : null;
    return { account, stats, strongest: str, weakest: wk };
  });

  const anyTimeData = perAccountSessions.some(a => a.stats.length > 0);

  const activeSessionNames = [...new Set(perAccountSessions.flatMap(a => a.stats.map(s => s.name)))];
  const orderedSessions = SESSION_DEFS.filter(d => activeSessionNames.includes(d.name));

  const multiWinRateData = orderedSessions.map(def => {
    const row: Record<string, string | number> = { name: def.name };
    perAccountSessions.forEach(({ account, stats }) => {
      const s = stats.find(s => s.name === def.name);
      row[account.name] = s?.winRate ?? 0;
    });
    return row;
  });

  const multiPnlData = orderedSessions.map(def => {
    const row: Record<string, string | number> = { name: def.name };
    perAccountSessions.forEach(({ account, stats }) => {
      const s = stats.find(s => s.name === def.name);
      row[account.name] = s?.pnl ?? 0;
    });
    return row;
  });

  return (
    <div id="reports-sessions" className="space-y-6">
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Session Cards */}
      {isMultiAccountMode ? (
        !anyTimeData ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Add entry times to your trades to see session analysis.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SESSION_DEFS.filter(def => activeSessionNames.includes(def.name)).map(def => (
              <Card key={def.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{def.name} Session</CardTitle>
                  <p className="text-xs text-muted-foreground">{def.hours}</p>
                </CardHeader>
                <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
                  <CardContent className="space-y-2">
                    {perAccountSessions.map(({ account, stats }, idx) => {
                      const s = stats.find(s => s.name === def.name);
                      if (!s) return null;
                      const acctSym = accountSymByName[account.name] ?? sym;
                      return (
                        <div key={account.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium" style={{ color: getAccountColor(idx) }} title={account.name}>{shortAccountName(account.name)}</span>
                          <span className="text-muted-foreground">{s.winRate}% · <span className={s.pnl >= 0 ? 'text-success' : 'text-destructive'}>{s.pnl >= 0 ? '+' : ''}{acctSym}{s.pnl.toLocaleString()}</span> · {s.trades}T</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </CardFeatureGate>
              </Card>
            ))}
          </div>
        )
      ) : (
        !hasTimeData ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Add entry times to your trades to see session analysis.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sessionData.map((session) => (
              <Card
                key={session.name}
                className={session.name === strongest?.name ? 'border-success/50 bg-success/5' : ''}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{session.name} Session</CardTitle>
                    <div className="flex items-center gap-1.5">
                      {isLocked && <TierBadge requiredPlan="standard" />}
                      {session.name === strongest?.name && !isLocked && (
                        <Badge className="bg-success/20 text-success text-xs">Strongest</Badge>
                      )}
                      {session.name === weakest?.name && !isLocked && (
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
                        <p className="text-xs text-muted-foreground">Profit Rate</p>
                        <p className="text-lg font-bold text-foreground">{session.winRate}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total P&L</p>
                        <p className={`text-lg font-bold ${session.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {session.pnl >= 0 ? '+' : ''}{sym}{session.pnl.toLocaleString()}
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
        )
      )}

      {/* Comparison Chart */}
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
                {isMultiAccountMode ? (
                  <BarChart data={multiWinRateData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      cursor={false}
                      formatter={(value: number, name: string) => [`${value}%`, shortAccountName(name)]}
                    />
                    <Legend formatter={(v: string) => shortAccountName(v)} />
                    {perAccountSessions.map(({ account }, idx) => (
                      <Bar key={account.id} dataKey={account.name} fill={getAccountColor(idx)} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      cursor={false}
                      formatter={(value: number, name: string) => {
                        if (name === 'winRate') return [`${value}%`, 'Profit Rate'];
                        if (name === 'pnl') return [`${sym}${value.toLocaleString()}`, 'P&L'];
                        if (name === 'avgRR') return [`${(value / 100).toFixed(1)}`, 'Avg R:R'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="winRate" name="winRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
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
                {isMultiAccountMode ? (
                  <BarChart data={multiPnlData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      cursor={false}
                      formatter={(value: number, name: string) => {
                        const acctSym = accountSymByName[name] ?? sym;
                        return [`${acctSym}${value.toLocaleString()}`, shortAccountName(name)];
                      }}
                    />
                    <Legend formatter={(v: string) => shortAccountName(v)} />
                    {perAccountSessions.map(({ account }, idx) => (
                      <Bar key={account.id} dataKey={account.name} fill={getAccountColor(idx)} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={chartData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      cursor={false}
                      formatter={(value: number) => [`${sym}${value.toLocaleString()}`, 'P&L']}
                    />
                    <Bar dataKey="pnl" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Recommendations */}
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
            {isMultiAccountMode ? (
              !anyTimeData ? (
                <p className="text-sm text-muted-foreground">
                  Add entry times to your trades to see session recommendations.
                </p>
              ) : (
                <div className="space-y-4">
                  {perAccountSessions.map(({ account, strongest: str, weakest: wk }, idx) => {
                    const acctSym = accountSymByName[account.name] ?? sym;
                    if (!str && !wk) return null;
                    return (
                      <div key={account.id}>
                        <p className="text-sm font-semibold mb-2 truncate" style={{ color: getAccountColor(idx) }} title={account.name}>{shortAccountName(account.name)}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {str && (
                            <div className="p-3 rounded-lg border-success/30 bg-success/5 border">
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="h-4 w-4 text-success" />
                                <p className="text-sm font-medium">Trade More</p>
                              </div>
                              <p className="text-xs font-medium text-foreground">{str.name} Session</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {str.winRate}% win rate · {acctSym}{str.pnl.toLocaleString()} P&L
                              </p>
                            </div>
                          )}
                          {wk && wk.name !== str?.name && (
                            <div className="p-3 rounded-lg border-destructive/30 bg-destructive/5 border">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <p className="text-sm font-medium">Reduce Exposure</p>
                              </div>
                              <p className="text-xs font-medium text-foreground">{wk.name} Session</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {wk.winRate}% win rate · {acctSym}{wk.pnl.toLocaleString()} P&L
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              !strongest || !weakest ? (
                <p className="text-sm text-muted-foreground">
                  Add entry times to your trades to see session recommendations.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border-success/30 bg-success/5 border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-success" />
                      <p className="text-base font-medium">Recommended to Trade More</p>
                    </div>
                    <p className="text-sm text-foreground font-medium">{strongest.name} Session</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your highest profit rate ({strongest.winRate}%) and best P&L ({sym}{strongest.pnl.toLocaleString()}).
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
                      Lowest profit rate ({weakest.winRate}%) and P&L ({sym}{weakest.pnl.toLocaleString()}).
                      Review your setups for this session or reduce size.
                    </p>
                  </div>
                </div>
              )
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>
    </div>
  );
}
