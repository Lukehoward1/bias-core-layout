import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Star, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
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

interface ReportsSetupQualityProps {
  trades: Trade[];
  dateRangeLabel: string;
  isLocked?: boolean;
  sym?: string;
  pinStates?: {
    bestWorst: PinState;
    patterns: PinState;
  };
  tradesByAccount?: AccountTrades[];
  combineMode?: boolean;
  canCombine?: boolean;
}

const KEYWORDS = ['late entry', 'fear', 'hesitation', 'fomo', 'missed level', 'early exit', 'overtrading', 'revenge', 'perfect', 'patient'];
const RATING_LABELS = ['1 Star', '2 Star', '3 Star', '4 Star', '5 Star', 'Unrated'];

function buildRatingGroups(ts: Trade[]) {
  const groups = [1, 2, 3, 4, 5].map(rating => {
    const rated = ts.filter(t => t.rating === rating);
    const wins = rated.filter(t => t.pnl > 0).length;
    const totalPnlVal = rated.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnl = rated.length > 0 ? totalPnlVal / rated.length : 0;
    return {
      rating: `${rating} Star`,
      ratingNum: rating,
      trades: rated.length,
      winRate: rated.length > 0 ? Math.round((wins / rated.length) * 100) : 0,
      totalPnl: totalPnlVal,
      avgPnl: Math.round(avgPnl),
      expectancy: Math.round(avgPnl),
    };
  });
  const unrated = ts.filter(t => !t.rating || t.rating === 0);
  const unratedTotalPnl = unrated.reduce((sum, t) => sum + t.pnl, 0);
  const unratedAvgPnl = unrated.length > 0 ? unratedTotalPnl / unrated.length : 0;
  const unratedStats = {
    rating: 'Unrated',
    ratingNum: 0,
    trades: unrated.length,
    winRate: unrated.length > 0 ? Math.round((unrated.filter(t => t.pnl > 0).length / unrated.length) * 100) : 0,
    totalPnl: unratedTotalPnl,
    avgPnl: Math.round(unratedAvgPnl),
    expectancy: Math.round(unratedAvgPnl),
  };
  return { groups, unratedStats };
}

export function ReportsSetupQuality({ trades, dateRangeLabel, pinStates, isLocked = false, sym = '£', tradesByAccount, combineMode, canCombine }: ReportsSetupQualityProps) {
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

  // Single-account path
  const { groups: ratingGroups, unratedStats } = buildRatingGroups(trades);
  const allSetups = [...ratingGroups, unratedStats].filter(s => s.trades > 0);
  const ratedWithTrades = ratingGroups.filter(s => s.trades > 0);
  const bestSetup = ratedWithTrades.length > 0
    ? ratedWithTrades.reduce((b, s) => s.expectancy > b.expectancy ? s : b, ratedWithTrades[0])
    : null;
  const worstSetup = ratedWithTrades.length > 0
    ? ratedWithTrades.reduce((w, s) => s.expectancy < w.expectancy ? s : w, ratedWithTrades[0])
    : null;

  const keywordCounts = KEYWORDS.reduce((acc, kw) => {
    const count = trades.filter(t => t.notes?.toLowerCase().includes(kw)).length;
    if (count > 0) acc.push({ keyword: kw, count });
    return acc;
  }, [] as { keyword: string; count: number }[]).sort((a, b) => b.count - a.count);

  const timeData = trades
    .filter(t => t.rating && t.rating >= 4)
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((acc, t, i) => {
      const prev = acc[acc.length - 1]?.cumPnl || 0;
      acc.push({ trade: i + 1, cumPnl: prev + t.pnl, date: t.date });
      return acc;
    }, [] as { trade: number; cumPnl: number; date: string }[]);

  // Multi-account path
  const perAccountSetup = (tradesByAccount ?? []).map(({ account, trades: ts }) => {
    const acctSym = accountSymByName[account.name] ?? sym;
    const { groups, unratedStats: ur } = buildRatingGroups(ts);
    const all = [...groups, ur].filter(s => s.trades > 0);
    const rated = groups.filter(s => s.trades > 0);
    const best = rated.length > 0 ? rated.reduce((b, s) => s.expectancy > b.expectancy ? s : b, rated[0]) : null;
    const worst = rated.length > 0 ? rated.reduce((w, s) => s.expectancy < w.expectancy ? s : w, rated[0]) : null;
    const acctTimeData = ts
      .filter(t => t.rating && t.rating >= 4)
      .sort((a, b) => a.date.localeCompare(b.date))
      .reduce((acc, t, i) => {
        const prev = acc[acc.length - 1]?.cumPnl || 0;
        acc.push({ trade: i + 1, cumPnl: prev + t.pnl });
        return acc;
      }, [] as { trade: number; cumPnl: number }[]);
    return { account, acctSym, all, best, worst, acctTimeData };
  });

  // Grouped rating bar chart data
  const multiRatingData = RATING_LABELS
    .map(label => {
      const row: Record<string, string | number> = { rating: label };
      perAccountSetup.forEach(({ account, all }) => {
        const s = all.find(s => s.rating === label);
        row[account.name] = s?.expectancy ?? 0;
      });
      return row;
    })
    .filter(row => perAccountSetup.some(({ account }) => {
      const s = perAccountSetup.find(a => a.account.id === account.id)?.all.find(s => s.rating === row.rating);
      return (s?.trades ?? 0) > 0;
    }));

  // Multi-account table rows: flat (setup × account)
  const multiTableRows = perAccountSetup.flatMap(({ account, acctSym, all }, idx) =>
    all.map(s => ({ ...s, accountName: account.name, acctSym, colorIdx: idx }))
  );

  return (
    <div id="reports-setup" className="space-y-6">
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Best & Worst Setups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Best & Worst Setups</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.bestWorst && (
                <AddToDashboardButton
                  isAdded={pinStates.bestWorst.isAdded}
                  onAdd={pinStates.bestWorst.onAdd}
                  onRemove={pinStates.bestWorst.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {isMultiAccountMode ? (
              <div className="space-y-4">
                {perAccountSetup.map(({ account, acctSym, best, worst }, idx) => (
                  <div key={account.id}>
                    <p className="text-sm font-semibold mb-2 truncate" style={{ color: getAccountColor(idx) }} title={account.name}>{shortAccountName(account.name)}</p>
                    {!best && !worst ? (
                      <p className="text-xs text-muted-foreground">No rated trades yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {best && (
                          <div className="p-3 rounded-lg border-success/30 bg-success/5 border">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="h-4 w-4 text-success" />
                              <p className="text-sm font-medium">Best — {best.rating}</p>
                            </div>
                            <p className="text-lg font-bold text-success">{acctSym}{best.expectancy}/trade</p>
                            <p className="text-xs text-muted-foreground">{best.winRate}% profit rate · {best.trades} trades</p>
                          </div>
                        )}
                        {worst && worst.rating !== best?.rating && (
                          <div className="p-3 rounded-lg border-destructive/30 bg-destructive/5 border">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingDown className="h-4 w-4 text-destructive" />
                              <p className="text-sm font-medium">Worst — {worst.rating}</p>
                            </div>
                            <p className="text-lg font-bold text-destructive">{acctSym}{worst.expectancy}/trade</p>
                            <p className="text-xs text-muted-foreground">{worst.winRate}% profit rate · {worst.trades} trades</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border-success/30 bg-success/5 border">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-success" />
                    <p className="text-base font-medium">Best Setup</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex">
                      {[...Array(bestSetup?.ratingNum || 0)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">{bestSetup?.trades || 0} trades</span>
                  </div>
                  <p className="text-2xl font-bold text-success mt-2">
                    {sym}{bestSetup?.expectancy?.toLocaleString() || 0}/trade expectancy
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{bestSetup?.winRate || 0}% profit rate</p>
                </div>
                <div className="p-4 rounded-lg border-destructive/30 bg-destructive/5 border">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    <p className="text-base font-medium">Worst Setup</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex">
                      {[...Array(worstSetup?.ratingNum || 0)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">{worstSetup?.trades || 0} trades</span>
                  </div>
                  <p className="text-2xl font-bold text-destructive mt-2">
                    {sym}{worstSetup?.expectancy?.toLocaleString() || 0}/trade expectancy
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{worstSetup?.winRate || 0}% profit rate</p>
                </div>
              </div>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Setup Performance by Rating */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Setup Performance by Rating</CardTitle>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {isMultiAccountMode ? (
                  <BarChart data={multiRatingData}>
                    <XAxis dataKey="rating" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        const acctSym = accountSymByName[name] ?? sym;
                        return [`${acctSym}${value}`, shortAccountName(name)];
                      }}
                    />
                    <Legend formatter={(v: string) => shortAccountName(v)} />
                    {perAccountSetup.map(({ account }, idx) => (
                      <Bar key={account.id} dataKey={account.name} fill={getAccountColor(idx)} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={allSetups}>
                    <XAxis dataKey="rating" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'expectancy') return [`${sym}${value}`, 'Expectancy'];
                        if (name === 'winRate') return [`${value}%`, 'Profit Rate'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="expectancy" name="expectancy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Setup Statistics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Setup Statistics</CardTitle>
            {isLocked && <TierBadge requiredPlan="standard" />}
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
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Rating</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Trades</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Profit Rate</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Total P&L</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Avg P&L</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Expectancy</th>
                  </tr>
                </thead>
                <tbody>
                  {isMultiAccountMode ? (
                    multiTableRows.map((s, i) => (
                      <tr key={`${s.accountName}-${s.rating}-${i}`} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-3">
                          <span className="text-xs font-medium block truncate" style={{ color: getAccountColor(s.colorIdx) }} title={s.accountName}>{shortAccountName(s.accountName)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            {s.ratingNum > 0 ? (
                              [...Array(s.ratingNum)].map((_, j) => (
                                <Star key={j} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
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
                            {s.totalPnl >= 0 ? '+' : ''}{s.acctSym}{s.totalPnl.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-sm ${s.avgPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {s.acctSym}{s.avgPnl}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-sm font-medium ${s.expectancy >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {s.acctSym}{s.expectancy}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    allSetups.map((s) => (
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
                            {s.totalPnl >= 0 ? '+' : ''}{sym}{s.totalPnl.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-sm ${s.avgPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {sym}{s.avgPnl}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-sm font-medium ${s.expectancy >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {sym}{s.expectancy}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Common Patterns in Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Common Patterns in Notes</CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.patterns && (
                <AddToDashboardButton
                  isAdded={pinStates.patterns.isAdded}
                  onAdd={pinStates.patterns.onAdd}
                  onRemove={pinStates.patterns.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {keywordCounts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {keywordCounts.map((kw) => (
                  <Badge key={kw.keyword} variant="secondary" className="text-sm px-3 py-1">
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
        </CardFeatureGate>
      </Card>

      {/* High-Rated Setup Performance Over Time */}
      {(isMultiAccountMode ? perAccountSetup.some(a => a.acctTimeData.length > 0) : timeData.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>4-5 Star Setup Performance Over Time</CardTitle>
              {isLocked && <TierBadge requiredPlan="standard" />}
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent>
              {isMultiAccountMode ? (
                <div className="space-y-4">
                  {perAccountSetup.map(({ account, acctSym, acctTimeData }, idx) => {
                    if (acctTimeData.length === 0) return null;
                    return (
                      <div key={account.id}>
                        <p className="text-sm font-semibold mb-2 truncate" style={{ color: getAccountColor(idx) }} title={account.name}>{shortAccountName(account.name)}</p>
                        <div className="h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={acctTimeData}>
                              <XAxis dataKey="trade" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                                formatter={(value: number) => [`${acctSym}${value.toLocaleString()}`, 'Cum. P&L']}
                              />
                              <Line type="monotone" dataKey="cumPnl" stroke={getAccountColor(idx)} strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeData}>
                      <XAxis dataKey="trade" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number) => [`${sym}${value.toLocaleString()}`, 'Cumulative P&L']}
                      />
                      <Line type="monotone" dataKey="cumPnl" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </CardFeatureGate>
        </Card>
      )}
    </div>
  );
}
