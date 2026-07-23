import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Shield, AlertTriangle } from "lucide-react";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { CardFeatureGate, TierBadge } from "@/components/journal/FeatureGate";
import { calculateTradeRisk } from "@/lib/risk-calculations";
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
  stopLoss?: number;
  actualR?: number | null;
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

interface ReportsRiskManagementProps {
  trades: Trade[];
  dateRangeLabel: string;
  isLocked?: boolean;
  sym?: string;
  accountBalance?: number;
  pinStates?: {
    kpis: PinState;
    distribution: PinState;
    discipline: PinState;
  };
  tradesByAccount?: AccountTrades[];
  combineMode?: boolean;
  canCombine?: boolean;
}

const RISK_BUCKET_THRESHOLDS = [50, 100, 150, 200];

function buildRiskStats(ts: Trade[], acctSym: string, balance: number | null | undefined) {
  const tradeRisks = ts.map(t => ({
    trade: t,
    risk: calculateTradeRisk(t.entry, t.stopLoss, t.lots, t.pair),
  }));
  const withRisk = tradeRisks.filter(r => r.risk !== null) as { trade: Trade; risk: number }[];
  const risks = withRisk.map(r => r.risk);
  const avgRisk = risks.length > 0 ? risks.reduce((a, b) => a + b, 0) / risks.length : 0;
  const maxRisk = risks.length > 0 ? Math.max(...risks) : 0;
  const losingTrades = ts.filter(t => t.pnl < 0);
  const maxLoss = losingTrades.length > 0 ? Math.max(...losingTrades.map(t => Math.abs(t.pnl))) : 0;
  const totalLoss = losingTrades.reduce((s, t) => s + Math.abs(t.pnl), 0);
  const threshold = balance != null && balance > 0 ? balance * 0.02 : null;
  const excessiveTrades = threshold != null ? withRisk.filter(r => r.risk > threshold).map(r => r.trade) : [];

  const riskBuckets = [
    { range: `${acctSym}0-50`,   count: risks.filter(r => r <= 50).length },
    { range: `${acctSym}50-100`, count: risks.filter(r => r > 50 && r <= 100).length },
    { range: `${acctSym}100-150`,count: risks.filter(r => r > 100 && r <= 150).length },
    { range: `${acctSym}150-200`,count: risks.filter(r => r > 150 && r <= 200).length },
    { range: `${acctSym}200+`,   count: risks.filter(r => r > 200).length },
  ];

  let score = 100;
  score -= excessiveTrades.length * 5;
  const variance = risks.length > 0 ? risks.reduce((acc, r) => acc + Math.pow(r - avgRisk, 2), 0) / risks.length : 0;
  if (variance > 2000) score -= 15; else if (variance > 1000) score -= 10;
  if (variance < 500) score += 5;
  const disciplineScore = Math.max(0, Math.min(100, score));

  return { risks, withRisk, avgRisk, maxRisk, maxLoss, totalLoss, losingTrades, threshold, excessiveTrades, riskBuckets, disciplineScore, coverage: withRisk.length };
}

export function ReportsRiskManagement({ trades, dateRangeLabel, pinStates, isLocked = false, sym = '£', accountBalance, tradesByAccount, combineMode, canCombine }: ReportsRiskManagementProps) {
  const { exportToPdf } = usePdfExport();

  const isMultiAccountMode = (tradesByAccount?.length ?? 0) > 1 && !(combineMode && canCombine);

  const accountSymByName = Object.fromEntries(
    (tradesByAccount ?? []).map(({ account }) => [account.name, currencySymbol(account.currency)])
  );

  // Summary stats for PDF export
  const summaryWinningTrades = trades.filter(t => t.pnl > 0);
  const summaryLosingTrades = trades.filter(t => t.pnl < 0);
  const summaryTotalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const summaryWinRate = trades.length > 0 ? (summaryWinningTrades.length / trades.length) * 100 : 0;
  const summaryAvgWin = summaryWinningTrades.length > 0 ? summaryWinningTrades.reduce((sum, t) => sum + t.pnl, 0) / summaryWinningTrades.length : 0;
  const summaryAvgLoss = summaryLosingTrades.length > 0 ? Math.abs(summaryLosingTrades.reduce((sum, t) => sum + t.pnl, 0) / summaryLosingTrades.length) : 1;
  const summaryAvgRR = summaryAvgLoss > 0 ? summaryAvgWin / summaryAvgLoss : 0;

  const handleExport = () => {
    exportToPdf('reports-risk', {
      filename: `StreamBias-RiskManagement-${new Date().toISOString().split('T')[0]}`,
      title: 'Risk Management Report',
      dateRange: dateRangeLabel,
      userName: 'John Trader',
      trades: {
        totalPnl: summaryTotalPnl,
        winRate: summaryWinRate,
        avgRR: summaryAvgRR,
        tradeCount: trades.length,
        bestDay: null,
        worstDay: null,
      },
    });
  };

  // Single-account stats
  const single = buildRiskStats(trades, sym, accountBalance);

  // Multi-account per-account stats
  const perAccountRisk = (tradesByAccount ?? []).map(({ account, trades: ts }) => {
    const acctSym = accountSymByName[account.name] ?? sym;
    const acctBalance = account.balance != null && account.balance > 0 ? account.balance : null;
    return { account, acctSym, ...buildRiskStats(ts, acctSym, acctBalance) };
  });

  // Grouped distribution chart data: bucket labels × account counts
  const BUCKET_LABELS = [`0-50`, `50-100`, `100-150`, `150-200`, `200+`];
  const multiDistribData = BUCKET_LABELS.map((label, bi) => {
    const row: Record<string, string | number> = { range: label };
    perAccountRisk.forEach(({ account, riskBuckets }) => {
      row[account.name] = riskBuckets[bi]?.count ?? 0;
    });
    return row;
  });

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  };

  return (
    <div id="reports-risk" className="space-y-6">
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Risk KPIs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Risk KPIs</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.kpis && (
                <AddToDashboardButton
                  isAdded={pinStates.kpis.isAdded}
                  onAdd={pinStates.kpis.onAdd}
                  onRemove={pinStates.kpis.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {isMultiAccountMode ? (
              <div className="space-y-4">
                {perAccountRisk.map(({ account, acctSym, avgRisk, maxRisk, maxLoss, totalLoss, losingTrades: ld, coverage, risks }, idx) => (
                  <div key={account.id}>
                    <p className="text-sm font-semibold mb-2 truncate" style={{ color: getAccountColor(idx) }} title={account.name}>{shortAccountName(account.name)}</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Risk/Trade</p>
                        <p className="text-xl font-bold text-foreground">
                          {risks.length > 0 ? `${acctSym}${Math.round(avgRisk)}` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Max Risk Taken</p>
                        <p className="text-xl font-bold text-foreground">
                          {risks.length > 0 ? `${acctSym}${Math.round(maxRisk)}` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Max Single Loss</p>
                        <p className="text-xl font-bold text-destructive">-{acctSym}{maxLoss.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Losses</p>
                        <p className="text-xl font-bold text-destructive">-{acctSym}{totalLoss.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{ld.length} losing trades</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Risk/Trade</p>
                    <p className="text-2xl font-bold text-foreground">
                      {single.risks.length > 0 ? `${sym}${Math.round(single.avgRisk)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max Risk Taken</p>
                    <p className="text-2xl font-bold text-foreground">
                      {single.risks.length > 0 ? `${sym}${Math.round(single.maxRisk)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max Single Loss</p>
                    <p className="text-2xl font-bold text-destructive">-{sym}{single.maxLoss.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Losses</p>
                    <p className="text-2xl font-bold text-destructive">-{sym}{single.totalLoss.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{single.losingTrades.length} losing trades</p>
                  </div>
                </div>
                {trades.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Risk figures based on {single.coverage} of {trades.length} trades with a stop loss set.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Risk Distribution per Trade</CardTitle>
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
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                {isMultiAccountMode ? (
                  <BarChart data={multiDistribData}>
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      cursor={false}
                      formatter={(value: number, name: string) => [value, shortAccountName(name)]}
                    />
                    <Legend formatter={(v: string) => shortAccountName(v)} />
                    {perAccountRisk.map(({ account }, idx) => (
                      <Bar key={account.id} dataKey={account.name} fill={getAccountColor(idx)} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                ) : (
                  <BarChart data={single.riskBuckets}>
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      cursor={false}
                      formatter={(value: number) => [value, 'Trades']}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Excessive Risk Trades */}
      <Card className={(!isMultiAccountMode && single.excessiveTrades.length > 0) ? 'border-amber-500/30' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${(!isMultiAccountMode && single.excessiveTrades.length > 0) ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <CardTitle>Trades Exceeding Planned Risk</CardTitle>
            </div>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {isMultiAccountMode ? (
              <div className="space-y-5">
                {perAccountRisk.map(({ account, acctSym, threshold, excessiveTrades }, idx) => (
                  <div key={account.id}>
                    <p className="text-sm font-semibold mb-2 truncate" style={{ color: getAccountColor(idx) }} title={account.name}>{shortAccountName(account.name)}</p>
                    {threshold == null ? (
                      <p className="text-xs text-muted-foreground">Set an account balance to enable threshold detection (2% of balance).</p>
                    ) : excessiveTrades.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-amber-500 font-medium">
                          {excessiveTrades.length} trades exceeded 2% account risk ({acctSym}{Math.round(threshold)})
                        </p>
                        {excessiveTrades.slice(0, 5).map((t) => {
                          const tradeRisk = calculateTradeRisk(t.entry, t.stopLoss, t.lots, t.pair);
                          return (
                            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <div>
                                <Badge variant="outline">{t.pair}</Badge>
                                <span className="text-xs text-muted-foreground ml-2">{t.date}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-medium">{acctSym}{Math.round(tradeRisk ?? 0)} risk</span>
                                <span className={`text-xs ml-2 ${t.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {t.pnl >= 0 ? '+' : ''}{acctSym}{t.pnl}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-success">✓ All trades within 2% risk limit ({acctSym}{Math.round(threshold)})</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              single.threshold == null ? (
                <p className="text-sm text-muted-foreground">
                  Set an account balance to enable threshold detection (2% of balance).
                </p>
              ) : single.excessiveTrades.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-amber-500 font-medium">
                    {single.excessiveTrades.length} trades exceeded 2% account risk ({sym}{Math.round(single.threshold)})
                  </p>
                  <div className="space-y-2 mt-3">
                    {single.excessiveTrades.slice(0, 5).map((t) => {
                      const tradeRisk = calculateTradeRisk(t.entry, t.stopLoss, t.lots, t.pair);
                      return (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <div>
                            <Badge variant="outline">{t.pair}</Badge>
                            <span className="text-xs text-muted-foreground ml-2">{t.date}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">{sym}{Math.round(tradeRisk ?? 0)} risk</span>
                            <span className={`text-xs ml-2 ${t.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {t.pnl >= 0 ? '+' : ''}{sym}{t.pnl}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-success">
                  ✓ All trades within 2% risk limit ({sym}{Math.round(single.threshold)})
                </p>
              )
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Risk Discipline Score */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Your Risk Discipline Score</CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.discipline && (
                <AddToDashboardButton
                  isAdded={pinStates.discipline.isAdded}
                  onAdd={pinStates.discipline.onAdd}
                  onRemove={pinStates.discipline.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {isMultiAccountMode ? (
              <div className="space-y-4">
                {perAccountRisk.map(({ account, disciplineScore }, idx) => (
                  <div key={account.id} className="flex items-center gap-4">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="26" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
                        <circle
                          cx="32" cy="32" r="26"
                          stroke={disciplineScore >= 60 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                          strokeWidth="6" fill="none"
                          strokeDasharray={`${(disciplineScore / 100) * 163.4} 163.4`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold">{disciplineScore}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold truncate" style={{ color: getAccountColor(idx) }} title={account.name}>{shortAccountName(account.name)}</p>
                      <p className={`text-base font-bold ${disciplineScore >= 60 ? 'text-success' : 'text-destructive'}`}>
                        {getScoreLabel(disciplineScore)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                    <circle
                      cx="48" cy="48" r="40"
                      stroke={single.disciplineScore >= 60 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      strokeWidth="8" fill="none"
                      strokeDasharray={`${(single.disciplineScore / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{single.disciplineScore}</span>
                  </div>
                </div>
                <div>
                  <p className={`text-lg font-bold ${single.disciplineScore >= 60 ? 'text-success' : 'text-destructive'}`}>
                    {getScoreLabel(single.disciplineScore)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {single.disciplineScore >= 80
                      ? 'Outstanding risk management discipline!'
                      : single.disciplineScore >= 60
                        ? 'Good discipline, minor improvements possible.'
                        : 'Focus on consistent position sizing and risk limits.'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Slippage — requires broker data */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-muted-foreground">Average Slippage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Slippage tracking requires broker execution data and will be available with live broker sync.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
