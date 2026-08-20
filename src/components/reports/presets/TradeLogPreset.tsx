// src/components/reports/presets/TradeLogPreset.tsx
//
// Unlike the other presets, the live Trade Log tab is an interactive
// searchable/sortable table rather than a set of stat cards — print has no
// use for filters, so this preset's job is simply to lay out the full,
// already-filtered trade list as a clean ledger, with a small summary row
// on top for context.

import { useMemo } from "react";
import {
  ReportThemeLock,
  ReportShell,
  ReportMasthead,
  ReportPrintButton,
  ReportKpiCard,
  ReportSectionCard,
  ReportFooter,
  type HeroMetric,
} from "../shell";
import type { PresetProps } from "./types";

const fmtSigned = (v: number, sym = "£") =>
  `${v >= 0 ? "+" : "-"}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function TradeLogPreset({
  trades: filtered,
  reportTitle,
  periodLabel,
  periodStartLabel,
  periodEndLabel,
  accountLabel,
  generatedAt,
  reportId,
  onPrint,
  openingBalance,
  closingBalance,
}: PresetProps) {
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered]);

  const wins = filtered.filter((t) => t.status === "win").length;
  const losses = filtered.filter((t) => t.status === "loss").length;
  const breakevens = filtered.filter((t) => t.status === "breakeven").length;
  const netPnl = filtered.reduce((s, t) => s + t.pnl, 0);
  const profit = filtered.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const loss = Math.abs(filtered.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const winRate = filtered.length > 0 ? Math.round((wins / filtered.length) * 100) : 0;
  const avgPnl = filtered.length > 0 ? netPnl / filtered.length : 0;

  const heroMetrics: HeroMetric[] = [
    { label: "Total Trades", value: `${filtered.length}`, tone: "neutral" },
    { label: "Net P&L", value: fmtSigned(netPnl), tone: netPnl >= 0 ? "pos" : "neg" },
    { label: "Profit / Loss", value: `${fmtSigned(profit)} / -${loss.toLocaleString()}`, tone: "neutral" },
    { label: "Win Rate", value: `${winRate}%`, tone: "neutral" },
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
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No trades in this period.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4">
                <ReportKpiCard label="Winning Trades" delta={{ text: `${winRate}% win rate`, tone: "pos" }}>
                  <span className="text-2xl font-bold text-success">{wins}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Losing Trades" delta={{ text: `${filtered.length > 0 ? Math.round((losses / filtered.length) * 100) : 0}% of trades`, tone: "neg" }}>
                  <span className="text-2xl font-bold text-destructive">{losses}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Breakeven Trades" delta={{ text: "Neither win nor loss", tone: "neutral" }}>
                  <span className="text-2xl font-bold text-foreground">{breakevens}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Avg P&L / Trade" delta={{ text: "Across all trades this period", tone: "neutral" }}>
                  <span className={`text-2xl font-bold ${avgPnl >= 0 ? "text-success" : "text-destructive"}`}>{fmtSigned(avgPnl)}</span>
                </ReportKpiCard>
              </div>

              <ReportSectionCard title="Account Balance" subtitle="Opening plus trade performance equals closing">
                {openingBalance == null || closingBalance == null ? (
                  <p className="text-sm text-muted-foreground">
                    Set a balance on this account to see opening and closing balance for the period.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 print:gap-2">
                    <div className="flex-1 min-w-[140px]">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Opening Balance</p>
                      <p className="text-lg font-bold text-foreground">{fmtSigned(openingBalance).replace("+", "")}</p>
                      <p className="text-[10px] text-muted-foreground">as of {periodStartLabel}</p>
                    </div>
                    <span className="text-lg text-muted-foreground">+</span>
                    <div className="flex-1 min-w-[140px]">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Trade Performance</p>
                      <p className={`text-lg font-bold ${netPnl >= 0 ? "text-success" : "text-destructive"}`}>{fmtSigned(netPnl)}</p>
                      <p className="text-[10px] text-muted-foreground">{filtered.length} trades this period</p>
                    </div>
                    <span className="text-lg text-muted-foreground">=</span>
                    <div className="flex-1 min-w-[140px]">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Closing Balance</p>
                      <p className="text-lg font-bold text-foreground">{fmtSigned(closingBalance).replace("+", "")}</p>
                      <p className="text-[10px] text-muted-foreground">as of {periodEndLabel}</p>
                    </div>
                  </div>
                )}
              </ReportSectionCard>

              <ReportSectionCard title="Trade Log" subtitle={`${filtered.length} trades, ${periodLabel}`} noPadding>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-2 print:py-1 font-medium">Date</th>
                      <th className="px-5 py-2 print:py-1 font-medium">Pair</th>
                      <th className="px-5 py-2 print:py-1 font-medium">Type</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">Entry</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">Exit</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">Lots</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">P&L</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0 print:break-inside-avoid">
                        <td className="px-5 py-2 print:py-1 text-muted-foreground">{t.date}</td>
                        <td className="px-5 py-2 print:py-1 font-medium text-foreground">{t.pair ?? "—"}</td>
                        <td className="px-5 py-2 print:py-1 text-muted-foreground">{t.type ?? "—"}</td>
                        <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{t.entry ?? "—"}</td>
                        <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{t.exit ?? "—"}</td>
                        <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{t.lots ?? "—"}</td>
                        <td className={`px-5 py-2 print:py-1 text-right font-semibold ${t.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {fmtSigned(t.pnl)}
                        </td>
                        <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">
                          {t.rating ? "★".repeat(t.rating) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ReportSectionCard>
            </>
          )}
        </div>

        <ReportFooter generatedAt={generatedAt} accountLabel={accountLabel} reportId={reportId} />
      </ReportShell>
    </ReportThemeLock>
  );
}
