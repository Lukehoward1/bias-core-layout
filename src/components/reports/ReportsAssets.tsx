import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Star, Target } from "lucide-react";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { CardFeatureGate, TierBadge } from "@/components/journal/FeatureGate";
import type { LinkedAccount } from "@/hooks/use-linked-accounts";
import { getAccountColor } from "@/lib/account-colors";
import { currencySymbol } from "@/lib/currency";

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

interface ReportsAssetsProps {
  trades: Trade[];
  dateRangeLabel: string;
  isLocked?: boolean;
  sym?: string;
  tradesByAccount?: AccountTrades[];
  combineMode?: boolean;
  canCombine?: boolean;
  pinStates?: {
    pnlChart: PinState;
    table: PinState;
  };
}

function buildPairData(ts: Trade[]) {
  const stats = ts.reduce((acc, t) => {
    if (!acc[t.pair]) acc[t.pair] = { pair: t.pair, pnl: 0, wins: 0, losses: 0, ratings: [] as number[] };
    acc[t.pair].pnl += t.pnl;
    if (t.pnl > 0) acc[t.pair].wins++;
    else if (t.pnl < 0) acc[t.pair].losses++;
    if (t.rating) acc[t.pair].ratings.push(t.rating);
    return acc;
  }, {} as Record<string, { pair: string; pnl: number; wins: number; losses: number; ratings: number[] }>);

  return Object.values(stats).map(p => ({
    ...p,
    trades: p.wins + p.losses,
    winRate: p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0,
    avgRating: p.ratings.length > 0 ? (p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length).toFixed(1) : 'N/A',
    confidence: p.ratings.length > 0 ? Math.round((p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length) * 20) : 50,
  })).sort((a, b) => b.pnl - a.pnl);
}

export function ReportsAssets({
  trades,
  dateRangeLabel,
  pinStates,
  isLocked = false,
  sym = '£',
  tradesByAccount,
  combineMode = false,
  canCombine = false,
}: ReportsAssetsProps) {
  const { exportToPdf } = usePdfExport();

  // Calculate summary stats for PDF export
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
      trades: { totalPnl, winRate, avgRR, tradeCount: trades.length, bestDay: null, worstDay: null },
    });
  };

  // Single / combined view data
  const pairData = buildPairData(trades);
  const bestPair = pairData[0];
  const chartData = pairData.slice(0, 8).map(p => ({ pair: p.pair, pnl: p.pnl, winRate: p.winRate }));

  // Multi-account mode: all-accounts selected + combine off
  const isMultiAccountMode = (tradesByAccount?.length ?? 0) > 1 && !(combineMode && canCombine);

  // Per-account pair breakdowns
  const perAccountData = isMultiAccountMode
    ? (tradesByAccount ?? []).map(({ account, trades: acctTrades }, idx) => ({
        account,
        idx,
        data: buildPairData(acctTrades),
        acctSym: currencySymbol(account.currency),
      }))
    : [];

  // account name → currency symbol, used by the grouped chart tooltip
  const accountSymByName = Object.fromEntries(
    (tradesByAccount ?? []).map(({ account }) => [account.name, currencySymbol(account.currency)])
  );

  // Grouped bar chart data: one column per pair, one Bar per account
  const multiChartData = isMultiAccountMode
    ? (() => {
        const allPairs = [...new Set((tradesByAccount ?? []).flatMap(({ trades: t }) => t.map(tr => tr.pair)))];
        return allPairs
          .map(pair => {
            const row: Record<string, string | number> = { pair };
            (tradesByAccount ?? []).forEach(({ account, trades: t }) => {
              row[account.name] = Math.round(t.filter(tr => tr.pair === pair).reduce((s, tr) => s + tr.pnl, 0));
            });
            return row;
          })
          .sort((a, b) => {
            const sumA = (tradesByAccount ?? []).reduce((s, { account }) => s + ((a[account.name] as number) || 0), 0);
            const sumB = (tradesByAccount ?? []).reduce((s, { account }) => s + ((b[account.name] as number) || 0), 0);
            return sumB - sumA;
          })
          .slice(0, 8);
      })()
    : [];

  // Flat (pair × account) rows for the table in multi-account mode
  const multiTableRows = isMultiAccountMode
    ? perAccountData.flatMap(({ account, idx, data, acctSym }) =>
        data.map(p => ({ ...p, account, accountIdx: idx, acctSym }))
      ).sort((a, b) => b.pnl - a.pnl)
    : [];

  return (
    <div id="reports-assets" className="space-y-6">
      {/* Header with export */}
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Top Insight Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Your Most Profitable Pair This Month</CardTitle>
            </div>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {isMultiAccountMode ? (
              <div className="space-y-2">
                {perAccountData.map(({ account, idx, data, acctSym }) => {
                  const best = data[0];
                  const color = getAccountColor(idx);
                  return (
                    <div key={account.id} className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold w-24 truncate shrink-0" style={{ color }}>
                        {account.name}
                      </span>
                      {best ? (
                        <>
                          <Badge className="text-sm px-2 py-0.5">{best.pair}</Badge>
                          <span className="text-base font-bold text-success">
                            +{acctSym}{best.pnl.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({best.trades} trades, {best.winRate}% profit rate)
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No trades</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Badge className="text-lg px-3 py-1">{bestPair?.pair || 'N/A'}</Badge>
                <span className="text-2xl font-bold text-success">
                  +{sym}{bestPair?.pnl?.toLocaleString() || 0}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({bestPair?.trades || 0} trades, {bestPair?.winRate || 0}% profit rate)
                </span>
              </div>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* P&L by Pair Chart - with per-card pin */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>P&L by Instrument</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.pnlChart && (
                <AddToDashboardButton
                  isAdded={pinStates.pnlChart.isAdded}
                  onAdd={pinStates.pnlChart.onAdd}
                  onRemove={pinStates.pnlChart.onRemove}
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
                  <BarChart data={multiChartData}>
                    <XAxis dataKey="pair" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        `${accountSymByName[name] ?? sym}${value.toLocaleString()}`,
                        name,
                      ]}
                    />
                    <Legend />
                    {(tradesByAccount ?? []).map(({ account }, idx) => (
                      <Bar
                        key={account.id}
                        dataKey={account.name}
                        fill={getAccountColor(idx)}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={chartData}>
                    <XAxis dataKey="pair" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${sym}${value.toLocaleString()}`, 'P&L']}
                    />
                    <Bar dataKey="pnl" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Best & Worst Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <CardTitle className="text-base">Best Performing</CardTitle>
              </div>
              {isLocked && <TierBadge requiredPlan="standard" />}
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent>
              {isMultiAccountMode ? (
                <div className="space-y-2">
                  {perAccountData.map(({ account, idx, data, acctSym }) => {
                    const best = data[0];
                    const color = getAccountColor(idx);
                    return (
                      <div key={account.id} className="flex items-center justify-between p-2 rounded-lg bg-success/5 border border-success/20">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color }}>{account.name}</span>
                          {best && <Badge variant="outline">{best.pair}</Badge>}
                        </div>
                        <span className="text-sm font-bold text-success">
                          {best ? `+${acctSym}${best.pnl.toLocaleString()}` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {pairData.slice(0, 3).map((p, idx) => (
                    <div key={p.pair} className="flex items-center justify-between p-2 rounded-lg bg-success/5 border border-success/20">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                        <Badge variant="outline">{p.pair}</Badge>
                      </div>
                      <span className="text-sm font-bold text-success">+{sym}{p.pnl.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CardFeatureGate>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base">Worst Performing</CardTitle>
              </div>
              {isLocked && <TierBadge requiredPlan="standard" />}
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent>
              {isMultiAccountMode ? (
                <div className="space-y-2">
                  {perAccountData.map(({ account, idx, data, acctSym }) => {
                    const worst = data[data.length - 1];
                    const color = getAccountColor(idx);
                    return (
                      <div key={account.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color }}>{account.name}</span>
                          {worst && <Badge variant="outline">{worst.pair}</Badge>}
                        </div>
                        <span className={`text-sm font-bold ${(worst?.pnl ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {worst
                            ? `${worst.pnl >= 0 ? '+' : ''}${acctSym}${worst.pnl.toLocaleString()}`
                            : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {pairData.slice(-3).reverse().map((p, idx) => (
                    <div key={p.pair} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                        <Badge variant="outline">{p.pair}</Badge>
                      </div>
                      <span className={`text-sm font-bold ${p.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {p.pnl >= 0 ? '+' : ''}{sym}{p.pnl.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CardFeatureGate>
        </Card>
      </div>

      {/* Detailed Stats Table - with per-card pin */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Instrument Statistics</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.table && (
                <AddToDashboardButton
                  isAdded={pinStates.table.isAdded}
                  onAdd={pinStates.table.onAdd}
                  onRemove={pinStates.table.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {isMultiAccountMode && (
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Account</th>
                    )}
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Pair</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Trades</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Profit Rate</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">P&L</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Avg Rating</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {isMultiAccountMode
                    ? multiTableRows.map((p) => (
                        <tr key={`${p.pair}_${p.account.id}`} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-3">
                            <span
                              className="text-xs font-semibold"
                              style={{ color: getAccountColor(p.accountIdx) }}
                            >
                              {p.account.name}
                            </span>
                          </td>
                          <td className="py-3 px-3"><Badge variant="outline">{p.pair}</Badge></td>
                          <td className="py-3 px-3 text-sm text-foreground">{p.trades}</td>
                          <td className="py-3 px-3 text-sm text-foreground">{p.winRate}%</td>
                          <td className="py-3 px-3">
                            <span className={`text-sm font-medium ${p.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {p.pnl >= 0 ? '+' : ''}{p.acctSym}{p.pnl.toLocaleString()}
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
                                <div className="h-full bg-primary rounded-full" style={{ width: `${p.confidence}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{p.confidence}%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    : pairData.map((p) => (
                        <tr key={p.pair} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-3"><Badge variant="outline">{p.pair}</Badge></td>
                          <td className="py-3 px-3 text-sm text-foreground">{p.trades}</td>
                          <td className="py-3 px-3 text-sm text-foreground">{p.winRate}%</td>
                          <td className="py-3 px-3">
                            <span className={`text-sm font-medium ${p.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {p.pnl >= 0 ? '+' : ''}{sym}{p.pnl.toLocaleString()}
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
                                <div className="h-full bg-primary rounded-full" style={{ width: `${p.confidence}%` }} />
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
        </CardFeatureGate>
      </Card>
    </div>
  );
}
