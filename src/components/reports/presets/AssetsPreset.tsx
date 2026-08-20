// src/components/reports/presets/AssetsPreset.tsx

import { useMemo } from "react";
import {
  ReportThemeLock,
  ReportShell,
  ReportMasthead,
  ReportKpiCard,
  ReportSectionCard,
  ReportBarChart,
  ReportFooter,
  type HeroMetric,
} from "../shell";
import type { PresetProps, PresetTrade } from "./types";

const fmtSigned = (v: number, sym = "£") =>
  `${v >= 0 ? "+" : "-"}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function buildPairData(ts: PresetTrade[]) {
  const stats = ts.reduce((acc, t) => {
    const pair = t.pair ?? "Unknown";
    if (!acc[pair]) acc[pair] = { pair, pnl: 0, wins: 0, losses: 0, ratings: [] as number[] };
    acc[pair].pnl += t.pnl;
    if (t.status === "win") acc[pair].wins++;
    else if (t.status === "loss") acc[pair].losses++;
    if (t.rating) acc[pair].ratings.push(t.rating);
    return acc;
  }, {} as Record<string, { pair: string; pnl: number; wins: number; losses: number; ratings: number[] }>);

  return Object.values(stats)
    .map((p) => ({
      ...p,
      trades: p.wins + p.losses,
      winRate: p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0,
      avgRating: p.ratings.length > 0 ? (p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length).toFixed(1) : "N/A",
    }))
    .sort((a, b) => b.pnl - a.pnl);
}

export function AssetsPreset({
  trades: filtered,
  reportTitle,
  periodLabel,
  accountLabel,
  generatedAt,
  reportId,
  onPrint,
}: PresetProps) {
  const pairData = useMemo(() => buildPairData(filtered), [filtered]);
  const bestPair = pairData[0] ?? null;
  const worstPair = pairData.length > 0 ? pairData[pairData.length - 1] : null;
  const mostTraded = pairData.length > 0
    ? pairData.reduce((most, p) => (p.trades > most.trades ? p : most), pairData[0])
    : null;
  const highestWinRate = pairData.length > 0
    ? pairData.reduce((best, p) => (p.winRate > best.winRate ? p : best), pairData[0])
    : null;

  const heroMetrics: HeroMetric[] = [
    { label: "Best Instrument", value: bestPair ? bestPair.pair : "—", tone: "pos" },
    { label: "Worst Instrument", value: worstPair ? worstPair.pair : "—", tone: "neg" },
    { label: "Instruments Traded", value: `${pairData.length}`, tone: "neutral" },
    { label: "Most Traded", value: mostTraded ? `${mostTraded.pair} (${mostTraded.trades})` : "—", tone: "neutral" },
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
          {pairData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No trades in this period.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4">
                <ReportKpiCard label="Best Instrument" delta={{ text: bestPair ? `${bestPair.trades} trades, ${bestPair.winRate}% win rate` : "No data", tone: "pos" }}>
                  {bestPair ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-foreground">{bestPair.pair}</span>
                      <span className="text-xl font-bold text-success">{fmtSigned(bestPair.pnl)}</span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-foreground">—</span>
                  )}
                </ReportKpiCard>
                <ReportKpiCard label="Worst Instrument" delta={{ text: worstPair ? `${worstPair.trades} trades, ${worstPair.winRate}% win rate` : "No data", tone: "neg" }}>
                  {worstPair ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-foreground">{worstPair.pair}</span>
                      <span className={`text-xl font-bold ${worstPair.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                        {fmtSigned(worstPair.pnl)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-foreground">—</span>
                  )}
                </ReportKpiCard>
                <ReportKpiCard label="Most Traded" delta={{ text: "By trade count", tone: "neutral" }}>
                  <span className="text-2xl font-bold text-foreground">{mostTraded ? mostTraded.pair : "—"}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Highest Win Rate" delta={{ text: highestWinRate ? `${highestWinRate.trades} trades` : "No data", tone: "neutral" }}>
                  <span className="text-2xl font-bold text-foreground">{highestWinRate ? `${highestWinRate.pair} (${highestWinRate.winRate}%)` : "—"}</span>
                </ReportKpiCard>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <ReportSectionCard title="P&L by Instrument" subtitle="Top instruments by net P&L" className="col-span-2">
                  <ReportBarChart
                    data={pairData.slice(0, 8).map((p) => ({
                      label: p.pair,
                      value: p.pnl,
                      color: p.pnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))",
                    }))}
                    valueFormatter={(v) => fmtSigned(v)}
                    tooltipLabel="P&L"
                    height="h-56 print:h-40"
                    emptyMessage="No trades yet."
                  />
                </ReportSectionCard>
                <ReportSectionCard title="Win Rate by Instrument" subtitle="Top 5 by trade count" className="col-span-1">
                  <ReportBarChart
                    data={[...pairData]
                      .sort((a, b) => b.trades - a.trades)
                      .slice(0, 5)
                      .map((p) => ({ label: p.pair, value: p.winRate }))}
                    unit="%"
                    tooltipLabel="Win Rate"
                    height="h-56 print:h-40"
                    emptyMessage="No trades yet."
                  />
                </ReportSectionCard>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <ReportSectionCard title="Instrument Statistics" subtitle="Full breakdown by pair" className="col-span-2" noPadding>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-5 py-2 print:py-1 font-medium">Pair</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Trades</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Win Rate</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Avg Rating</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pairData.map((p) => (
                        <tr key={p.pair} className="border-b border-border last:border-0">
                          <td className="px-5 py-2 print:py-1 font-medium text-foreground">{p.pair}</td>
                          <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{p.trades}</td>
                          <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{p.winRate}%</td>
                          <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{p.avgRating}</td>
                          <td className={`px-5 py-2 print:py-1 text-right font-semibold ${p.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {fmtSigned(p.pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ReportSectionCard>

                <ReportSectionCard title="Best & Worst" subtitle="Top and bottom 3 performers" className="col-span-1">
                  <div className="space-y-2 print:space-y-1.5">
                    {pairData.slice(0, 3).map((p, idx) => (
                      <div key={`best-${p.pair}`} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">#{idx + 1} {p.pair}</span>
                        <span className="font-semibold text-success">{fmtSigned(p.pnl)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border my-1" />
                    {pairData.slice(-3).reverse().map((p, idx) => (
                      <div key={`worst-${p.pair}`} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">#{idx + 1} {p.pair}</span>
                        <span className={`font-semibold ${p.pnl >= 0 ? "text-success" : "text-destructive"}`}>{fmtSigned(p.pnl)}</span>
                      </div>
                    ))}
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
