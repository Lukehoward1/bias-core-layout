import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Zap } from "lucide-react";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { CardFeatureGate, TierBadge } from "@/components/journal/FeatureGate";
import type { LinkedAccount } from "@/hooks/use-linked-accounts";
import type { Trade as JournalTrade } from "@/hooks/use-journal-trades";
import { useAccountAwareStats } from "@/hooks/use-account-aware-stats";
import { AccountAwareEquityChart } from "@/components/shared/AccountAwareEquityChart";
import { AccountAwareStat } from "@/components/shared/AccountAwareStat";
import {
  ACTIVE_ACCOUNT_ALL,
  useAccountCombineMode,
} from "@/hooks/use-active-trading-account";
import { getAccountColor, shortAccountName } from "@/lib/account-colors";

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

interface ReportsOverviewProps {
  trades: Trade[];
  accounts: LinkedAccount[];
  activeAccountId: string;
  dateRangeLabel: string;
  isLocked?: boolean;
  sym?: string;
  pinStates?: {
    totalPnl: PinState;
    avgRR: PinState;
    winRate: PinState;
    expectancy: PinState;
    bestDay: PinState;
    worstDay: PinState;
    equity: PinState;
    rolling30: PinState;
    edge: PinState;
  };
}

export function ReportsOverview({ trades, accounts, activeAccountId, dateRangeLabel, pinStates, isLocked = false, sym = '£' }: ReportsOverviewProps) {
  const { exportToPdf } = usePdfExport();

  // ── Inline stats kept only for the PDF export call ──────────────────────────
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades  = trades.filter(t => t.pnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const avgWin  = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 1;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  const dailyPnl = trades.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] || 0) + t.pnl;
    return acc;
  }, {} as Record<string, number>);
  const dailyEntries = Object.entries(dailyPnl);
  const bestDayExport = dailyEntries.reduce((best, [date, pnl]) =>
    pnl > (best?.pnl ?? -Infinity) ? { date, pnl } : best,
    null as { date: string; pnl: number } | null,
  );
  const worstDayExport = dailyEntries.reduce((worst, [date, pnl]) =>
    pnl < (worst?.pnl ?? Infinity) ? { date, pnl } : worst,
    null as { date: string; pnl: number } | null,
  );

  // ── Per-account stats (full date range) — reused for all KPI cards ──────────
  const {
    perAccount: equityPerAccount,
    combined: equityCombined,
    canCombine: equityCanCombine,
  } = useAccountAwareStats(trades as unknown as JournalTrade[], accounts);
  const resolvedActiveAccountId = activeAccountId ?? ACTIVE_ACCOUNT_ALL;

  // ── Rolling 30-day subset ──────────────────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const rolling30DateStr = thirtyDaysAgo.toISOString().split('T')[0];
  const rolling30Trades = (trades as unknown as JournalTrade[]).filter(
    (t) => t.date >= rolling30DateStr,
  );
  const {
    perAccount: rolling30PerAccount,
    combined: rolling30Combined,
    canCombine: rolling30CanCombine,
  } = useAccountAwareStats(rolling30Trades, accounts);

  // ── Combine mode — read for Best/Worst Day three-mode logic ─────────────────
  const [combineMode] = useAccountCombineMode();
  const isAllAccounts = resolvedActiveAccountId === ACTIVE_ACCOUNT_ALL;

  // ── Best edge: compare 4–5★ vs 1–3★ rated trades (unrated excluded) ─────────
  const highConfTrades = trades.filter(t => t.rating != null && t.rating >= 4);
  const lowerRatedTrades = trades.filter(t => t.rating != null && t.rating >= 1 && t.rating <= 3);
  const EDGE_MIN_BUCKET = 5;
  const hasEdgeData = highConfTrades.length >= EDGE_MIN_BUCKET && lowerRatedTrades.length >= EDGE_MIN_BUCKET;
  const highConfStats = hasEdgeData ? {
    winRate: Math.round(highConfTrades.filter(t => t.pnl > 0).length / highConfTrades.length * 100),
    avgPnl: highConfTrades.reduce((s, t) => s + t.pnl, 0) / highConfTrades.length,
  } : null;
  const lowerRatedStats = hasEdgeData ? {
    winRate: Math.round(lowerRatedTrades.filter(t => t.pnl > 0).length / lowerRatedTrades.length * 100),
    avgPnl: lowerRatedTrades.reduce((s, t) => s + t.pnl, 0) / lowerRatedTrades.length,
  } : null;

  const handleExportOverview = () => {
    exportToPdf('reports-overview', {
      filename: `StreamBias-Overview-${new Date().toISOString().split('T')[0]}`,
      title: 'Overview Report',
      dateRange: dateRangeLabel,
      userName: 'John Trader',
      trades: {
        totalPnl,
        winRate,
        avgRR,
        tradeCount: trades.length,
        bestDay: bestDayExport,
        worstDay: worstDayExport,
      },
    });
  };

  // ── Best/Worst Day render helpers ──────────────────────────────────────────

  const fmtDay = (pnl: number) =>
    `${pnl >= 0 ? '+' : ''}${sym}${Math.abs(pnl).toLocaleString()}`;

  const fmtAvgPnl = (v: number) =>
    `${v >= 0 ? '' : '–'}${sym}${Math.abs(v).toFixed(0)}`;

  function SingleDay({
    day,
    colorClass,
  }: {
    day: { date: string; pnl: number } | null;
    colorClass: string;
  }) {
    if (!day) return <p className="text-sm text-muted-foreground">No data</p>;
    return (
      <>
        <p className={`text-2xl font-bold ${colorClass}`}>{fmtDay(day.pnl)}</p>
        <p className="text-xs text-muted-foreground mt-1">{day.date}</p>
      </>
    );
  }

  function MultiDayRows({ isBest }: { isBest: boolean }) {
    const entries = [...equityPerAccount.entries()];
    if (entries.length === 0) return <p className="text-sm text-muted-foreground">No data</p>;
    return (
      <div className="space-y-1.5">
        {entries.map(([accountId, entry], index) => {
          const color = getAccountColor(index);
          const day = isBest ? entry.stats.bestDay : entry.stats.worstDay;
          const cls = isBest
            ? "text-success"
            : (day?.pnl ?? 0) < 0 ? "text-destructive" : "text-success";
          return (
            <div
              key={accountId}
              className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/50"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate" title={entry.account.name}>{shortAccountName(entry.account.name)}</p>
                  {day && <p className="text-xs text-muted-foreground">{day.date}</p>}
                </div>
              </div>
              <span className={`text-sm font-semibold ml-2 flex-shrink-0 ${cls}`}>
                {day ? fmtDay(day.pnl) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  function BestDayContent() {
    if (!isAllAccounts) {
      const entry = equityPerAccount.get(resolvedActiveAccountId);
      return <SingleDay day={entry?.stats.bestDay ?? null} colorClass="text-success" />;
    }
    if (combineMode && equityCanCombine && equityCombined) {
      return <SingleDay day={equityCombined.stats.bestDay} colorClass="text-success" />;
    }
    return <MultiDayRows isBest={true} />;
  }

  function WorstDayContent() {
    if (!isAllAccounts) {
      const entry = equityPerAccount.get(resolvedActiveAccountId);
      const day = entry?.stats.worstDay ?? null;
      return (
        <SingleDay
          day={day}
          colorClass={day && day.pnl < 0 ? "text-destructive" : "text-success"}
        />
      );
    }
    if (combineMode && equityCanCombine && equityCombined) {
      const day = equityCombined.stats.worstDay;
      return (
        <SingleDay
          day={day}
          colorClass={day && day.pnl < 0 ? "text-destructive" : "text-success"}
        />
      );
    }
    return <MultiDayRows isBest={false} />;
  }

  return (
    <div id="reports-overview" className="space-y-6">
      {/* Header with export */}
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        <PdfExportButton onClick={handleExportOverview} />
      </div>

      {/* Key Metrics — 4 pinnable KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total P&L</CardTitle>
              <div className="flex items-center gap-1.5">
                {isLocked && <TierBadge requiredPlan="standard" />}
                {!isLocked && pinStates?.totalPnl && (
                  <AddToDashboardButton
                    isAdded={pinStates.totalPnl.isAdded}
                    onAdd={pinStates.totalPnl.onAdd}
                    onRemove={pinStates.totalPnl.onRemove}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent className="pt-0">
              <AccountAwareStat
                perAccount={equityPerAccount}
                combined={equityCombined}
                canCombine={equityCanCombine}
                activeAccountId={resolvedActiveAccountId}
                select={(s) => s.totalPnl}
                format={(v) => {
                  const n = Number(v);
                  return `${n >= 0 ? '+' : ''}${sym}${Math.abs(n).toLocaleString()}`;
                }}
                colorClass={(v) => Number(v) >= 0 ? 'text-success' : 'text-destructive'}
              />
            </CardContent>
          </CardFeatureGate>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg R:R</CardTitle>
              <div className="flex items-center gap-1.5">
                {isLocked && <TierBadge requiredPlan="standard" />}
                {!isLocked && pinStates?.avgRR && (
                  <AddToDashboardButton
                    isAdded={pinStates.avgRR.isAdded}
                    onAdd={pinStates.avgRR.onAdd}
                    onRemove={pinStates.avgRR.onRemove}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent className="pt-0">
              <AccountAwareStat
                perAccount={equityPerAccount}
                combined={equityCombined}
                canCombine={equityCanCombine}
                activeAccountId={resolvedActiveAccountId}
                select={(s) => s.avgRR}
                format={(v) => Number(v).toFixed(2)}
              />
            </CardContent>
          </CardFeatureGate>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Profit Rate</CardTitle>
              <div className="flex items-center gap-1.5">
                {isLocked && <TierBadge requiredPlan="standard" />}
                {!isLocked && pinStates?.winRate && (
                  <AddToDashboardButton
                    isAdded={pinStates.winRate.isAdded}
                    onAdd={pinStates.winRate.onAdd}
                    onRemove={pinStates.winRate.onRemove}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent className="pt-0">
              <AccountAwareStat
                perAccount={equityPerAccount}
                combined={equityCombined}
                canCombine={equityCanCombine}
                activeAccountId={resolvedActiveAccountId}
                select={(s) => s.winRate}
                format={(v) => `${Number(v).toFixed(1)}%`}
              />
            </CardContent>
          </CardFeatureGate>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Expectancy</CardTitle>
              <div className="flex items-center gap-1.5">
                {isLocked && <TierBadge requiredPlan="standard" />}
                {!isLocked && pinStates?.expectancy && (
                  <AddToDashboardButton
                    isAdded={pinStates.expectancy.isAdded}
                    onAdd={pinStates.expectancy.onAdd}
                    onRemove={pinStates.expectancy.onRemove}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent className="pt-0">
              <AccountAwareStat
                perAccount={equityPerAccount}
                combined={equityCombined}
                canCombine={equityCanCombine}
                activeAccountId={resolvedActiveAccountId}
                select={(s) => s.expectancy}
                format={(v) => `${sym}${Number(v).toFixed(0)}/trade`}
                colorClass={(v) => Number(v) >= 0 ? 'text-success' : 'text-destructive'}
              />
            </CardContent>
          </CardFeatureGate>
        </Card>
      </div>

      {/* Additional Metrics — 5 unpinnable cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Profit Factor</CardTitle>
              {isLocked && <TierBadge requiredPlan="standard" />}
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent className="pt-0">
              <AccountAwareStat
                perAccount={equityPerAccount}
                combined={equityCombined}
                canCombine={equityCanCombine}
                activeAccountId={resolvedActiveAccountId}
                select={(s) => s.profitFactor}
                format={(v) => String(v)}
              />
            </CardContent>
          </CardFeatureGate>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Max Consec. Wins</CardTitle>
              {isLocked && <TierBadge requiredPlan="standard" />}
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent className="pt-0">
              <AccountAwareStat
                perAccount={equityPerAccount}
                combined={equityCombined}
                canCombine={equityCanCombine}
                activeAccountId={resolvedActiveAccountId}
                select={(s) => s.maxConsecWins}
                format={(v) => String(v)}
                colorClass={() => 'text-success'}
              />
            </CardContent>
          </CardFeatureGate>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Max Consec. Losses</CardTitle>
              {isLocked && <TierBadge requiredPlan="standard" />}
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent className="pt-0">
              <AccountAwareStat
                perAccount={equityPerAccount}
                combined={equityCombined}
                canCombine={equityCanCombine}
                activeAccountId={resolvedActiveAccountId}
                select={(s) => s.maxConsecLosses}
                format={(v) => String(v)}
                colorClass={() => 'text-destructive'}
              />
            </CardContent>
          </CardFeatureGate>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg Winner</CardTitle>
              {isLocked && <TierBadge requiredPlan="standard" />}
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent className="pt-0">
              <AccountAwareStat
                perAccount={equityPerAccount}
                combined={equityCombined}
                canCombine={equityCanCombine}
                activeAccountId={resolvedActiveAccountId}
                select={(s) => s.avgWinner}
                format={(v) => `${sym}${Number(v).toFixed(0)}`}
                colorClass={() => 'text-success'}
              />
            </CardContent>
          </CardFeatureGate>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg Loser</CardTitle>
              {isLocked && <TierBadge requiredPlan="standard" />}
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent className="pt-0">
              <AccountAwareStat
                perAccount={equityPerAccount}
                combined={equityCombined}
                canCombine={equityCanCombine}
                activeAccountId={resolvedActiveAccountId}
                select={(s) => s.avgLoser}
                format={(v) => `${sym}${Number(v).toFixed(0)}`}
                colorClass={() => 'text-destructive'}
              />
            </CardContent>
          </CardFeatureGate>
        </Card>
      </div>

      {/* Best/Worst Day — bespoke three-mode (date+amount shape doesn't fit AccountAwareStat) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Best Winning Day</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                {isLocked && <TierBadge requiredPlan="standard" />}
                {!isLocked && pinStates?.bestDay && (
                  <AddToDashboardButton
                    isAdded={pinStates.bestDay.isAdded}
                    onAdd={pinStates.bestDay.onAdd}
                    onRemove={pinStates.bestDay.onRemove}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent>
              <BestDayContent />
            </CardContent>
          </CardFeatureGate>
        </Card>

        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-destructive" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Worst Losing Day</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                {isLocked && <TierBadge requiredPlan="standard" />}
                {!isLocked && pinStates?.worstDay && (
                  <AddToDashboardButton
                    isAdded={pinStates.worstDay.isAdded}
                    onAdd={pinStates.worstDay.onAdd}
                    onRemove={pinStates.worstDay.onRemove}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent>
              <WorstDayContent />
            </CardContent>
          </CardFeatureGate>
        </Card>
      </div>

      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Equity Curve</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.equity && (
                <AddToDashboardButton
                  isAdded={pinStates.equity.isAdded}
                  onAdd={pinStates.equity.onAdd}
                  onRemove={pinStates.equity.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            <AccountAwareEquityChart
              perAccount={equityPerAccount}
              combined={equityCombined}
              canCombine={equityCanCombine}
              activeAccountId={resolvedActiveAccountId}
              chartHeight="h-64"
              curveType="relative"
            />
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Rolling 30-Day Performance — same three-mode pattern as equity curve,
          but scoped to trades within the last 30 calendar days. Cumulative P&L
          from zero over that window; Combine view shows % return per account. */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rolling 30-Day Performance</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.rolling30 && (
                <AddToDashboardButton
                  isAdded={pinStates.rolling30.isAdded}
                  onAdd={pinStates.rolling30.onAdd}
                  onRemove={pinStates.rolling30.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            <AccountAwareEquityChart
              perAccount={rolling30PerAccount}
              combined={rolling30Combined}
              canCombine={rolling30CanCombine}
              activeAccountId={resolvedActiveAccountId}
              chartHeight="h-48"
              curveType="relative"
            />
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Strongest Edge Summary — compares 4–5★ vs 1–3★ rated trades:
          win rate and avg P&L per bucket. Requires ≥5 trades in each bucket. */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Your Strongest Edge This Month</CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.edge && (
                <AddToDashboardButton
                  isAdded={pinStates.edge.isAdded}
                  onAdd={pinStates.edge.onAdd}
                  onRemove={pinStates.edge.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {hasEdgeData && highConfStats && lowerRatedStats ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Your 4–5★ trades win {highConfStats.winRate}% of the time vs {lowerRatedStats.winRate}% for
                  1–3★ trades, averaging {fmtAvgPnl(highConfStats.avgPnl)} vs {fmtAvgPnl(lowerRatedStats.avgPnl)} per trade.
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">Based on ratings</Badge>
                  <Badge variant="outline" className="text-xs">Win rate & avg P&L</Badge>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Not enough rated trade history yet — rate at least {EDGE_MIN_BUCKET} trades in both the 4–5★ and 1–3★ buckets to unlock this comparison.
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">Based on ratings</Badge>
                  <Badge variant="outline" className="text-xs">Win rate & avg P&L</Badge>
                </div>
              </>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>
    </div>
  );
}
