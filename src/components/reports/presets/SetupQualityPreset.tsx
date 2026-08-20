// src/components/reports/presets/SetupQualityPreset.tsx

import { useMemo } from "react";
import {
  ReportThemeLock,
  ReportShell,
  ReportMasthead,
  ReportPrintButton,
  ReportKpiCard,
  ReportSectionCard,
  ReportBarChart,
  ReportFooter,
  type HeroMetric,
} from "../shell";
import type { PresetProps, PresetTrade } from "./types";

const KEYWORDS = ["late entry", "fear", "hesitation", "fomo", "missed level", "early exit", "overtrading", "revenge", "perfect", "patient"];

const fmtSigned = (v: number, sym = "£") =>
  `${v >= 0 ? "+" : "-"}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function buildRatingGroups(ts: PresetTrade[]) {
  const groups = [1, 2, 3, 4, 5].map((rating) => {
    const rated = ts.filter((t) => t.rating === rating);
    const wins = rated.filter((t) => t.status === "win").length;
    const totalPnl = rated.reduce((s, t) => s + t.pnl, 0);
    const avgPnl = rated.length > 0 ? totalPnl / rated.length : 0;
    return {
      rating: `${rating} Star`,
      ratingNum: rating,
      trades: rated.length,
      winRate: rated.length > 0 ? Math.round((wins / rated.length) * 100) : 0,
      totalPnl,
      avgPnl: Math.round(avgPnl),
      expectancy: Math.round(avgPnl),
    };
  });
  const unrated = ts.filter((t) => !t.rating || t.rating === 0);
  const unratedTotalPnl = unrated.reduce((s, t) => s + t.pnl, 0);
  const unratedAvgPnl = unrated.length > 0 ? unratedTotalPnl / unrated.length : 0;
  const unratedStats = {
    rating: "Unrated",
    ratingNum: 0,
    trades: unrated.length,
    winRate: unrated.length > 0 ? Math.round((unrated.filter((t) => t.status === "win").length / unrated.length) * 100) : 0,
    totalPnl: unratedTotalPnl,
    avgPnl: Math.round(unratedAvgPnl),
    expectancy: Math.round(unratedAvgPnl),
  };
  return { groups, unratedStats };
}

export function SetupQualityPreset({
  trades: filtered,
  reportTitle,
  periodLabel,
  accountLabel,
  generatedAt,
  reportId,
  onPrint,
}: PresetProps) {
  const { groups: ratingGroups, unratedStats } = useMemo(() => buildRatingGroups(filtered), [filtered]);
  const allSetups = useMemo(() => [...ratingGroups, unratedStats].filter((s) => s.trades > 0), [ratingGroups, unratedStats]);
  const ratedWithTrades = useMemo(() => ratingGroups.filter((s) => s.trades > 0), [ratingGroups]);

  const bestSetup = ratedWithTrades.length > 0
    ? ratedWithTrades.reduce((b, s) => (s.expectancy > b.expectancy ? s : b), ratedWithTrades[0])
    : null;
  const worstSetup = ratedWithTrades.length > 0
    ? ratedWithTrades.reduce((w, s) => (s.expectancy < w.expectancy ? s : w), ratedWithTrades[0])
    : null;

  const ratedTradeCount = filtered.filter((t) => t.rating && t.rating > 0).length;

  const keywordCounts = useMemo(
    () =>
      KEYWORDS.reduce((acc, kw) => {
        const count = filtered.filter((t) => t.notes?.toLowerCase().includes(kw)).length;
        if (count > 0) acc.push({ keyword: kw, count });
        return acc;
      }, [] as { keyword: string; count: number }[]).sort((a, b) => b.count - a.count),
    [filtered],
  );

  const heroMetrics: HeroMetric[] = [
    { label: "Best Setup", value: bestSetup ? `${bestSetup.rating} — ${fmtSigned(bestSetup.expectancy)}` : "—", tone: "pos" },
    { label: "Worst Setup", value: worstSetup ? `${worstSetup.rating} — ${fmtSigned(worstSetup.expectancy)}` : "—", tone: "neg" },
    { label: "Rated Trades", value: filtered.length > 0 ? `${Math.round((ratedTradeCount / filtered.length) * 100)}%` : "—", tone: "neutral" },
    { label: "Top Pattern", value: keywordCounts[0] ? keywordCounts[0].keyword : "—", tone: "neutral" },
  ];

  return (
    <ReportThemeLock>
      <ReportShell>
        <ReportMasthead
          reportTitle={reportTitle}
          periodLabel={periodLabel}
          heroMetrics={heroMetrics}
          actions={<ReportPrintButton onClick={onPrint} />}
        />

        <div className="p-6 space-y-6 print:p-3 print:space-y-2">
          {allSetups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No trades in this period.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4">
                <ReportKpiCard label="Best Setup" delta={{ text: bestSetup ? `${bestSetup.winRate}% win rate · ${bestSetup.trades} trades` : "No rated trades", tone: "pos" }}>
                  <span className="text-2xl font-bold text-success">{bestSetup ? bestSetup.rating : "—"}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Worst Setup" delta={{ text: worstSetup ? `${worstSetup.winRate}% win rate · ${worstSetup.trades} trades` : "No rated trades", tone: "neg" }}>
                  <span className="text-2xl font-bold text-destructive">{worstSetup ? worstSetup.rating : "—"}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Rated Trades" delta={{ text: "Of all trades this period", tone: "neutral" }}>
                  <span className="text-2xl font-bold text-foreground">{ratedTradeCount}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Unrated Trades" delta={{ text: "Consider rating more setups", tone: "neutral" }}>
                  <span className="text-2xl font-bold text-foreground">{unratedStats.trades}</span>
                </ReportKpiCard>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <ReportSectionCard title="Setup Performance by Rating" subtitle="Expectancy per trade by star rating" className="col-span-2">
                  <ReportBarChart
                    data={allSetups.map((s) => ({
                      label: s.rating,
                      value: s.expectancy,
                      color: s.expectancy >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))",
                    }))}
                    valueFormatter={(v) => fmtSigned(v)}
                    tooltipLabel="Expectancy"
                    height="h-56 print:h-40"
                    emptyMessage="No rated trades yet."
                  />
                </ReportSectionCard>
                <ReportSectionCard title="Common Patterns" subtitle="Keywords found in trade notes" className="col-span-1">
                  {keywordCounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Add notes to your trades to identify patterns.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 print:gap-1">
                      {keywordCounts.map((kw) => (
                        <span
                          key={kw.keyword}
                          className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border"
                        >
                          {kw.keyword} ({kw.count})
                        </span>
                      ))}
                    </div>
                  )}
                </ReportSectionCard>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <ReportSectionCard title="Setup Statistics" subtitle="Full breakdown by rating" className="col-span-2" noPadding>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-5 py-2 print:py-1 font-medium">Rating</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Trades</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Win Rate</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Total P&L</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Expectancy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSetups.map((s) => (
                        <tr key={s.rating} className="border-b border-border last:border-0">
                          <td className="px-5 py-2 print:py-1 font-medium text-foreground">{s.rating}</td>
                          <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{s.trades}</td>
                          <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{s.winRate}%</td>
                          <td className={`px-5 py-2 print:py-1 text-right ${s.totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {fmtSigned(s.totalPnl)}
                          </td>
                          <td className={`px-5 py-2 print:py-1 text-right font-semibold ${s.expectancy >= 0 ? "text-success" : "text-destructive"}`}>
                            {fmtSigned(s.expectancy)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ReportSectionCard>

                <ReportSectionCard title="Best & Worst Setups" subtitle="By expectancy per trade" className="col-span-1">
                  <div className="space-y-2 print:space-y-1.5">
                    {bestSetup && (
                      <div className="p-3 print:p-2 rounded-lg border border-success/30 bg-success/5">
                        <p className="text-xs font-semibold text-success">Best — {bestSetup.rating}</p>
                        <p className="text-xs font-medium text-foreground mt-0.5">{fmtSigned(bestSetup.expectancy)}/trade</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{bestSetup.winRate}% win rate · {bestSetup.trades} trades</p>
                      </div>
                    )}
                    {worstSetup && worstSetup.rating !== bestSetup?.rating && (
                      <div className="p-3 print:p-2 rounded-lg border border-destructive/30 bg-destructive/5">
                        <p className="text-xs font-semibold text-destructive">Worst — {worstSetup.rating}</p>
                        <p className="text-xs font-medium text-foreground mt-0.5">{fmtSigned(worstSetup.expectancy)}/trade</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{worstSetup.winRate}% win rate · {worstSetup.trades} trades</p>
                      </div>
                    )}
                  </div>
                </ReportSectionCard>
              </div>
            </>
          )}
        </div>

        <ReportFooter generatedAt={generatedAt} accountLabel={accountLabel} reportId={reportId} />
      </ReportShell>
    </ReportThemeLock>
  );
}
