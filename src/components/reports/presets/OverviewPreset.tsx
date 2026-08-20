// src/components/reports/presets/OverviewPreset.tsx

import { useMemo } from "react";
import {
  ReportThemeLock,
  ReportShell,
  ReportMasthead,
  ReportKpiCard,
  ReportSectionCard,
  ReportDonut,
  ReportFooter,
  type HeroMetric,
} from "../shell";
import { AccountAwareEquityChart } from "@/components/shared/AccountAwareEquityChart";
import type { AccountEntry, EquityPoint } from "@/hooks/use-account-aware-stats";
import type { PresetProps } from "./types";

const fmtSigned = (v: number, sym = "£") =>
  `${v >= 0 ? "+" : "-"}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function computeMaxDrawdown(curve: EquityPoint[]): number {
  let peak = 0;
  let maxDD = 0;
  for (const pt of curve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = pt.equity - peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD;
}

export function OverviewPreset({
  trades: filtered,
  reportTitle,
  periodLabel,
  accountLabel,
  generatedAt,
  reportId,
  onPrint,
}: PresetProps) {
  const metrics = useMemo(() => {
    const wins = filtered.filter((t) => t.status === "win");
    const losses = filtered.filter((t) => t.status === "loss");
    const breakevens = filtered.filter((t) => t.status === "breakeven").length;

    const totalTrades = filtered.length;
    const profitRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    const breakevenRate = totalTrades > 0 ? (breakevens / totalTrades) * 100 : 0;

    const posSum = wins.reduce((s, t) => s + t.pnl, 0);
    const negSum = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor =
      posSum === 0 ? "0.00" : negSum === 0 ? "∞" : (posSum / negSum).toFixed(2);

    const avgWin = wins.length > 0 ? posSum / wins.length : 0;
    const avgLoss = losses.length > 0 ? negSum / losses.length : 0;
    const wr = profitRate / 100;
    const expectancy = wr * avgWin - (1 - wr) * avgLoss;

    const winR = filtered
      .filter((t) => t.status === "win")
      .map((t) => t.actualR)
      .filter((r): r is number => r != null);
    const lossRAbs = losses
      .map((t) => t.actualR)
      .filter((r): r is number => r != null)
      .map(Math.abs);
    const avgWinR = winR.length > 0 ? winR.reduce((s, r) => s + r, 0) / winR.length : 0;
    const avgLossR = lossRAbs.length > 0 ? lossRAbs.reduce((s, r) => s + r, 0) / lossRAbs.length : 1;
    const avgRR = avgWinR / avgLossR;

    const netPnl = filtered.reduce((s, t) => s + t.pnl, 0);

    let maxConsecWins = 0, maxConsecLosses = 0, curW = 0, curL = 0;
    for (const t of filtered) {
      if (t.status === "win") {
        curW++; maxConsecWins = Math.max(maxConsecWins, curW); curL = 0;
      } else if (t.status === "loss") {
        curL++; maxConsecLosses = Math.max(maxConsecLosses, curL); curW = 0;
      } else {
        curW = 0; curL = 0;
      }
    }

    const dailyPnl = filtered.reduce((acc, t) => {
      acc[t.date] = (acc[t.date] ?? 0) + t.pnl;
      return acc;
    }, {} as Record<string, number>);
    const dailyEntries = Object.entries(dailyPnl);
    const bestDay = dailyEntries.reduce<{ date: string; pnl: number } | null>(
      (best, [date, pnl]) => (pnl > (best?.pnl ?? -Infinity) ? { date, pnl } : best),
      null,
    );
    const worstDay = dailyEntries.reduce<{ date: string; pnl: number } | null>(
      (worst, [date, pnl]) => (pnl < (worst?.pnl ?? Infinity) ? { date, pnl } : worst),
      null,
    );

    return {
      totalTrades, wins: wins.length, losses: losses.length, breakevens, breakevenRate,
      profitRate, profitFactor, expectancy, avgRR, netPnl,
      maxConsecWins, maxConsecLosses, bestDay, worstDay,
    };
  }, [filtered]);

  const equityCurve: EquityPoint[] = useMemo(() => {
    let cumulative = 0;
    return filtered.map((t) => {
      cumulative += t.pnl;
      return {
        date: t.date,
        equity: cumulative,
        formattedDate: new Date(t.date + "T12:00:00").toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      };
    });
  }, [filtered]);

  const equityEntry: AccountEntry = useMemo(
    () => ({
      account: { id: "__preview__", name: "Report Preview", broker: "", balance: 0, currency: "GBP", isConnected: true, lastUpdated: new Date() },
      stats: {} as AccountEntry["stats"],
      equityCurveRelative: equityCurve,
      equityCurveAbsolute: equityCurve,
    }),
    [equityCurve],
  );
  const equityPerAccount = useMemo(() => new Map([["__preview__", equityEntry]]), [equityEntry]);

  const maxDrawdown = equityCurve.length > 0 ? computeMaxDrawdown(equityCurve) : null;

  const sortedByPnl = [...filtered].sort((a, b) => b.pnl - a.pnl);
  const topWinners = sortedByPnl.filter((t) => t.pnl > 0).slice(0, 3);
  const topLosers = sortedByPnl.filter((t) => t.pnl < 0).slice(-3).reverse();
  const highlightRows = [...topWinners, ...topLosers];

  const heroMetrics: HeroMetric[] = [
    { label: "Net P&L", value: fmtSigned(metrics.netPnl), tone: metrics.netPnl >= 0 ? "pos" : "neg" },
    { label: "Win Rate", value: `${metrics.profitRate.toFixed(0)}%`, tone: "neutral" },
    { label: "Profit Factor", value: metrics.profitFactor, tone: "neutral" },
    { label: "Expectancy", value: `${fmtSigned(metrics.expectancy)}/trade`, tone: metrics.expectancy >= 0 ? "pos" : "neg" },
  ];

  return (
    <ReportThemeLock id="report-print-area">
      <ReportShell>
        <ReportMasthead
          reportTitle={reportTitle}
          periodLabel={periodLabel}
          heroMetrics={heroMetrics}
          actions={
            <button
              type="button"
              onClick={onPrint}
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Print
            </button>
          }
        />

        <div className="p-6 space-y-6 print:p-3 print:space-y-2">
          <div className="grid grid-cols-4 gap-4">
            <ReportKpiCard label="Total Trades" delta={{ text: `${metrics.breakevens} breakeven (${metrics.breakevenRate.toFixed(0)}%)`, tone: "neutral" }}>
              <span className="text-2xl font-bold text-foreground">{metrics.totalTrades}</span>
            </ReportKpiCard>
            <ReportKpiCard label="Net P&L" delta={{ text: "Realized this period", tone: "neutral" }}>
              <span className={`text-2xl font-bold ${metrics.netPnl >= 0 ? "text-success" : "text-destructive"}`}>
                {fmtSigned(metrics.netPnl)}
              </span>
            </ReportKpiCard>
            <ReportKpiCard label="Max Consec. Wins / Losses" delta={{ text: "Longest streaks this period", tone: "neutral" }}>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-success">{metrics.maxConsecWins}</span>
                <span className="text-muted-foreground text-sm">/</span>
                <span className="text-2xl font-bold text-destructive">{metrics.maxConsecLosses}</span>
              </div>
            </ReportKpiCard>
            <ReportKpiCard label="Avg R:R" delta={{ text: "Reward per unit risked", tone: "neutral" }}>
              <span className="text-2xl font-bold text-foreground">{metrics.avgRR.toFixed(2)}</span>
            </ReportKpiCard>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ReportSectionCard title="Win / Loss Split" subtitle={`${filtered.length} trades in period`} className="col-span-1">
              <ReportDonut
                data={[
                  { name: "Wins", value: metrics.wins, color: "hsl(var(--success))" },
                  { name: "Losses", value: metrics.losses, color: "hsl(var(--destructive))" },
                  { name: "Breakeven", value: metrics.breakevens, color: "hsl(var(--warning))" },
                ]}
                centerValue={`${metrics.profitRate.toFixed(0)}%`}
                centerLabel="Win Rate"
                emptyMessage="No closed trades yet."
              />
            </ReportSectionCard>
            <ReportSectionCard title="Equity Curve" subtitle="Cumulative P&L over the selected period" className="col-span-2">
              <AccountAwareEquityChart
                perAccount={equityPerAccount}
                combined={null}
                canCombine={false}
                activeAccountId="__preview__"
                chartHeight="h-64 print:h-44"
                curveType="relative"
              />
            </ReportSectionCard>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ReportSectionCard title="Trade Highlights" subtitle="Biggest winners and losers this period" className="col-span-2" noPadding>
              {highlightRows.length === 0 ? (
                <p className="text-sm text-muted-foreground p-5">No closed trades in this period.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-2 print:py-1 font-medium">Date</th>
                      <th className="px-5 py-2 print:py-1 font-medium">Pair</th>
                      <th className="px-5 py-2 print:py-1 font-medium">Type</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highlightRows.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-2 print:py-1 text-muted-foreground">{t.date}</td>
                        <td className="px-5 py-2 print:py-1 font-medium text-foreground">{t.pair ?? "—"}</td>
                        <td className="px-5 py-2 print:py-1 text-muted-foreground">{t.type ?? "—"}</td>
                        <td className={`px-5 py-2 print:py-1 text-right font-semibold ${t.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {fmtSigned(t.pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ReportSectionCard>

            <ReportSectionCard title="Risk Snapshot" subtitle="Drawdown and daily extremes" className="col-span-1">
              <div className="space-y-3 print:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Max Drawdown</span>
                  <span className="text-sm font-semibold text-destructive">
                    {maxDrawdown !== null ? fmtSigned(maxDrawdown) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Best Day</span>
                  <span className="text-sm font-semibold text-success">
                    {metrics.bestDay ? fmtSigned(metrics.bestDay.pnl) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Worst Day</span>
                  <span className={`text-sm font-semibold ${metrics.worstDay && metrics.worstDay.pnl < 0 ? "text-destructive" : "text-success"}`}>
                    {metrics.worstDay ? fmtSigned(metrics.worstDay.pnl) : "—"}
                  </span>
                </div>
              </div>
            </ReportSectionCard>
          </div>
        </div>

        <ReportFooter generatedAt={generatedAt} accountLabel={accountLabel} reportId={reportId} />
      </ReportShell>
    </ReportThemeLock>
  );
}
