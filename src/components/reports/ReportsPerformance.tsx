import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, parseISO, getDay } from "date-fns";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { CardFeatureGate, TierBadge } from "@/components/journal/FeatureGate";
import type { LinkedAccount } from "@/hooks/use-linked-accounts";
import { getAccountColor, shortAccountName } from "@/lib/account-colors";
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

interface ReportsPerformanceProps {
  trades: Trade[];
  dateRangeLabel: string;
  isLocked?: boolean;
  sym?: string;
  tradesByAccount?: AccountTrades[];
  combineMode?: boolean;
  canCombine?: boolean;
  pinStates?: {
    byDay: PinState;
    distribution: PinState;
  };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DURATION_BUCKETS = [
  { duration: 'Scalp (<1h)',      min: 0,   max: 59   },
  { duration: 'Intraday (1-8h)', min: 60,  max: 480  },
  { duration: 'Swing (>8h)',     min: 481, max: Infinity },
];

function computeTimedTrades(ts: Trade[]) {
  return ts
    .filter(t => t.entryTime && t.exitTime)
    .map(t => {
      const [eh, em] = t.entryTime!.split(':').map(Number);
      const [xh, xm] = t.exitTime!.split(':').map(Number);
      const entryMins = eh * 60 + em;
      let exitMins = xh * 60 + xm;
      if (exitMins < entryMins) exitMins += 24 * 60;
      return { ...t, holdMins: exitMins - entryMins };
    });
}

export function ReportsPerformance({
  trades,
  dateRangeLabel,
  pinStates,
  isLocked = false,
  sym = '£',
  tradesByAccount,
  combineMode = false,
  canCombine = false,
}: ReportsPerformanceProps) {
  const { exportToPdf } = usePdfExport();

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
      trades: { totalPnl, winRate, avgRR, tradeCount: trades.length, bestDay: null, worstDay: null },
    });
  };

  // Single / combined view
  const dayStats = DAYS.map((day, idx) => {
    const dt = trades.filter(t => getDay(parseISO(t.date)) === idx);
    const wins = dt.filter(t => t.pnl > 0).length;
    return { day, winRate: dt.length > 0 ? Math.round((wins / dt.length) * 100) : 0, trades: dt.length };
  });

  const distributionData = [
    { name: 'Long',  value: trades.filter(t => t.type === 'Long').length,  fill: 'hsl(var(--success))' },
    { name: 'Short', value: trades.filter(t => t.type === 'Short').length, fill: 'hsl(var(--destructive))' },
  ];

  const timedTrades = computeTimedTrades(trades);
  const hasHoldData = timedTrades.length > 0;

  const holdWinners = timedTrades.filter(t => t.pnl > 0);
  const holdLosers  = timedTrades.filter(t => t.pnl < 0);
  const avgHoldWinnersH = holdWinners.length > 0
    ? parseFloat((holdWinners.reduce((s, t) => s + t.holdMins, 0) / holdWinners.length / 60).toFixed(1)) : 0;
  const avgHoldLosersH = holdLosers.length > 0
    ? parseFloat((holdLosers.reduce((s, t) => s + t.holdMins, 0) / holdLosers.length / 60).toFixed(1)) : 0;

  const holdTimeData = [
    { type: 'Winners', avgHours: avgHoldWinnersH },
    { type: 'Losers',  avgHours: avgHoldLosersH  },
  ];

  const durationPnl = DURATION_BUCKETS.map(b => {
    const bucket = timedTrades.filter(t => t.holdMins >= b.min && t.holdMins <= b.max);
    return { duration: b.duration, pnl: Math.round(bucket.reduce((s, t) => s + t.pnl, 0)), trades: bucket.length };
  });

  const monthlyHeatmap = Object.values(
    trades.reduce((acc, t) => {
      const month = format(parseISO(t.date), 'MMM yyyy');
      if (!acc[month]) acc[month] = { month, pnl: 0, trades: 0 };
      acc[month].pnl += t.pnl;
      acc[month].trades += 1;
      return acc;
    }, {} as Record<string, { month: string; pnl: number; trades: number }>)
  );

  const isMultiAccountMode = (tradesByAccount?.length ?? 0) > 1 && !(combineMode && canCombine);

  const accountSymByName = Object.fromEntries(
    (tradesByAccount ?? []).map(({ account }) => [account.name, currencySymbol(account.currency)])
  );

  // Grouped day win-rate bars
  const multiDayStats = isMultiAccountMode
    ? DAYS.map((day, dayIdx) => {
        const row: Record<string, string | number> = { day };
        (tradesByAccount ?? []).forEach(({ account, trades: t }) => {
          const dt = t.filter(tr => getDay(parseISO(tr.date)) === dayIdx);
          row[account.name] = dt.length > 0 ? Math.round((dt.filter(tr => tr.pnl > 0).length / dt.length) * 100) : 0;
        });
        return row;
      })
    : [];

  // Per-account Long/Short rows
  const perAccountDistrib = isMultiAccountMode
    ? (tradesByAccount ?? []).map(({ account, trades: t }, idx) => ({
        account, idx,
        long: t.filter(tr => tr.type === 'Long').length,
        short: t.filter(tr => tr.type === 'Short').length,
      }))
    : [];

  // Per-account hold-time rows
  const perAccountHold = isMultiAccountMode
    ? (tradesByAccount ?? []).map(({ account, trades: t }, idx) => {
        const timed = computeTimedTrades(t);
        const w = timed.filter(tr => tr.pnl > 0);
        const l = timed.filter(tr => tr.pnl < 0);
        return {
          account, idx,
          hasTimed: timed.length > 0,
          avgWH: w.length > 0 ? parseFloat((w.reduce((s, tr) => s + tr.holdMins, 0) / w.length / 60).toFixed(1)) : null,
          avgLH: l.length > 0 ? parseFloat((l.reduce((s, tr) => s + tr.holdMins, 0) / l.length / 60).toFixed(1)) : null,
        };
      })
    : [];

  // Grouped duration P&L bars
  const multiDurationData = isMultiAccountMode
    ? DURATION_BUCKETS.map(b => {
        const row: Record<string, string | number> = { duration: b.duration };
        (tradesByAccount ?? []).forEach(({ account, trades: t }) => {
          const timed = computeTimedTrades(t);
          const bucket = timed.filter(tr => tr.holdMins >= b.min && tr.holdMins <= b.max);
          row[account.name] = Math.round(bucket.reduce((s, tr) => s + tr.pnl, 0));
        });
        return row;
      })
    : [];

  // Per-account monthly heatmaps
  const perAccountMonthly = isMultiAccountMode
    ? (tradesByAccount ?? []).map(({ account, trades: t }, idx) => ({
        account, idx,
        acctSym: currencySymbol(account.currency),
        data: Object.values(
          t.reduce((acc, tr) => {
            const month = format(parseISO(tr.date), 'MMM yyyy');
            if (!acc[month]) acc[month] = { month, pnl: 0, trades: 0 };
            acc[month].pnl += tr.pnl;
            acc[month].trades += 1;
            return acc;
          }, {} as Record<string, { month: string; pnl: number; trades: number }>)
        ),
      }))
    : [];

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
  };

  return (
    <div id="reports-performance" className="space-y-6">
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Profit Rate by Day of Week */}
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
                {isMultiAccountMode ? (
                  <BarChart data={multiDayStats}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                    <Tooltip contentStyle={tooltipStyle} cursor={false} formatter={(v: number, name: string) => [`${v}%`, shortAccountName(name)]} />
                    <Legend formatter={(v: string) => shortAccountName(v)} />
                    {(tradesByAccount ?? []).map(({ account }, idx) => (
                      <Bar key={account.id} dataKey={account.name} fill={getAccountColor(idx)} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={dayStats}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={false}
                      formatter={(value: number) => [`${value}%`, 'Profit Rate']}
                      labelFormatter={(label) => `${label} (${dayStats.find(d => d.day === label)?.trades || 0} trades)`}
                    />
                    <Bar dataKey="winRate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Trade Distribution (Long/Short) */}
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
            {isMultiAccountMode ? (
              <div className="grid grid-cols-2 gap-4">
                {perAccountDistrib.map(({ account, idx, long, short }) => {
                  const total = long + short;
                  const color = getAccountColor(idx);
                  const data = [
                    { name: 'Long',  value: long,  fill: 'hsl(var(--success))' },
                    { name: 'Short', value: short, fill: 'hsl(var(--destructive))' },
                  ];
                  return (
                    <div key={account.id} className="flex flex-col items-center">
                      <p className="text-xs font-semibold mb-1 truncate w-full text-center" style={{ color }} title={account.name}>
                        {shortAccountName(account.name)}
                      </p>
                      {total > 0 ? (
                        <>
                          <div className="h-28 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={44} paddingAngle={5} dataKey="value">
                                  {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-xs text-muted-foreground text-center mt-1">
                            <span className="text-success">L: {long}</span>
                            {' · '}
                            <span className="text-destructive">S: {short}</span>
                            {' '}({Math.round((long / total) * 100)}% / {Math.round((short / total) * 100)}%)
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">No trades</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
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
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
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
            {isMultiAccountMode ? (
              perAccountHold.some(r => r.hasTimed) ? (
                <div className="space-y-3">
                  {perAccountHold.map(({ account, idx, hasTimed, avgWH, avgLH }) => {
                    const color = getAccountColor(idx);
                    return (
                      <div key={account.id} className="flex items-center gap-3">
                        <span className="text-xs font-semibold w-24 truncate shrink-0" style={{ color }} title={account.name}>
                          {shortAccountName(account.name)}
                        </span>
                        {hasTimed ? (
                          <>
                            <span className="text-sm text-success">Winners: {avgWH ?? '—'}h</span>
                            <span className="text-sm text-destructive">Losers: {avgLH ?? '—'}h</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No time data</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add entry and exit times to your trades to see hold-time analysis.
                </p>
              )
            ) : !hasHoldData ? (
              <p className="text-sm text-muted-foreground">
                Add entry and exit times to your trades to see hold-time analysis.
              </p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={holdTimeData}>
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="h" />
                    <Tooltip contentStyle={tooltipStyle} cursor={false} formatter={(value: number) => [`${value}h`, 'Avg Hold Time']} />
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
            {isMultiAccountMode ? (
              perAccountHold.some(r => r.hasTimed) ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={multiDurationData}>
                      <XAxis dataKey="duration" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={false}
                        formatter={(v: number, name: string) => [
                          `${accountSymByName[name] ?? sym}${v.toLocaleString()}`,
                          shortAccountName(name),
                        ]}
                      />
                      <Legend formatter={(v: string) => shortAccountName(v)} />
                      {(tradesByAccount ?? []).map(({ account }, idx) => (
                        <Bar key={account.id} dataKey={account.name} fill={getAccountColor(idx)} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add entry and exit times to your trades to see duration breakdown.
                </p>
              )
            ) : !hasHoldData ? (
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
                      contentStyle={tooltipStyle}
                      cursor={false}
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

      {/* Monthly Performance Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monthly Performance Heatmap</CardTitle>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {isMultiAccountMode ? (
              <div className="space-y-6">
                {perAccountMonthly.map(({ account, idx, acctSym, data }) => (
                  <div key={account.id}>
                    <p className="text-xs font-semibold mb-2 truncate" style={{ color: getAccountColor(idx) }} title={account.name}>
                      {shortAccountName(account.name)}
                    </p>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                      {data.map((m, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg text-center border ${
                            m.pnl > 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
                          }`}
                        >
                          <p className="text-xs text-muted-foreground">{m.month}</p>
                          <p className={`text-sm font-bold ${m.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {m.pnl >= 0 ? '+' : ''}{acctSym}{m.pnl.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{m.trades} trades</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>
    </div>
  );
}
