// src/components/reports/presets/PsychologyPreset.tsx

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

const POSITIVE_KEYWORDS = ["patient", "perfect", "confident", "disciplined", "calm", "good setup", "followed plan", "great"];
const NEGATIVE_KEYWORDS = ["fear", "fomo", "hesitation", "revenge", "late entry", "early exit", "overtrading", "impatient", "greedy", "emotional"];
const PSYCH_VOCAB = [
  "fomo", "revenge", "hesitation", "hesitant", "discipline", "disciplined",
  "confident", "confidence", "fear", "greed", "patience", "impulsive",
  "anxious", "calm", "rushed", "overtrading",
];

const fmtSigned = (v: number, sym = "£") =>
  `${v >= 0 ? "+" : "-"}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function formatMins(mins: number) {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function buildHoldTrades(ts: PresetTrade[]) {
  return ts
    .filter((t) => t.entryTime && t.exitTime)
    .map((t) => {
      const [eh, em] = t.entryTime!.split(":").map(Number);
      const [xh, xm] = t.exitTime!.split(":").map(Number);
      const entryMins = eh * 60 + em;
      let exitMins = xh * 60 + xm;
      if (exitMins < entryMins) exitMins += 24 * 60;
      return { ...t, holdMins: exitMins - entryMins };
    });
}

export function PsychologyPreset({
  trades: filtered,
  reportTitle,
  periodLabel,
  accountLabel,
  generatedAt,
  reportId,
  onPrint,
}: PresetProps) {
  const tradesWithNotes = useMemo(() => filtered.filter((t) => t.notes && t.notes.trim().length > 0), [filtered]);
  const positiveNotes = useMemo(
    () => tradesWithNotes.filter((t) => POSITIVE_KEYWORDS.some((kw) => t.notes?.toLowerCase().includes(kw))),
    [tradesWithNotes],
  );
  const negativeNotes = useMemo(
    () => tradesWithNotes.filter((t) => NEGATIVE_KEYWORDS.some((kw) => t.notes?.toLowerCase().includes(kw))),
    [tradesWithNotes],
  );

  const topWords = useMemo(
    () =>
      PSYCH_VOCAB.map((term) => {
        const re = new RegExp(`\\b${term}\\b`, "i");
        const count = filtered.filter((t) => t.notes && re.test(t.notes)).length;
        return { word: term, count };
      })
        .filter(({ count }) => count > 0)
        .sort((a, b) => b.count - a.count),
    [filtered],
  );

  const triggerAnalysis = useMemo(
    () =>
      NEGATIVE_KEYWORDS.map((trigger) => {
        const triggerTrades = filtered.filter((t) => t.notes?.toLowerCase().includes(trigger));
        const totalPnl = triggerTrades.reduce((s, t) => s + t.pnl, 0);
        const avgPnl = triggerTrades.length > 0 ? totalPnl / triggerTrades.length : 0;
        return { trigger, count: triggerTrades.length, avgPnl, totalPnl };
      })
        .filter((t) => t.count > 0)
        .sort((a, b) => a.avgPnl - b.avgPnl),
    [filtered],
  );
  const topMistake = triggerAnalysis[0] ?? null;

  const confidentTrades = useMemo(
    () =>
      filtered
        .filter((t) => t.rating && t.rating >= 4 && t.pnl > 0)
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 5),
    [filtered],
  );

  const improvementFocus = useMemo(() => {
    if (topMistake) {
      return `Focus on eliminating "${topMistake.trigger}" — it has cost ${fmtSigned(Math.abs(topMistake.totalPnl)).replace("+", "")} across ${topMistake.count} trades.`;
    }
    if (filtered.length > 0 && tradesWithNotes.length < filtered.length * 0.3) {
      return "Start adding notes to more trades to identify psychological patterns.";
    }
    return "Keep maintaining trading discipline and documenting your thoughts.";
  }, [topMistake, tradesWithNotes.length, filtered.length]);

  const holdTimeTrades = useMemo(() => buildHoldTrades(filtered), [filtered]);
  const hasHoldData = holdTimeTrades.length > 0;
  const holdWinners = holdTimeTrades.filter((t) => t.pnl > 0);
  const holdLosers = holdTimeTrades.filter((t) => t.pnl < 0);
  const avgHoldWinners = holdWinners.length > 0 ? holdWinners.reduce((s, t) => s + t.holdMins, 0) / holdWinners.length : 0;
  const avgHoldLosers = holdLosers.length > 0 ? holdLosers.reduce((s, t) => s + t.holdMins, 0) / holdLosers.length : 0;

  const heroMetrics: HeroMetric[] = [
    { label: "Trades w/ Notes", value: filtered.length > 0 ? `${Math.round((tradesWithNotes.length / filtered.length) * 100)}%` : "—", tone: "neutral" },
    { label: "Sentiment", value: `${positiveNotes.length} pos / ${negativeNotes.length} neg`, tone: "neutral" },
    { label: "Top Trigger", value: topMistake ? topMistake.trigger : "—", tone: "neg" },
    { label: "Avg Hold (Win)", value: hasHoldData ? formatMins(avgHoldWinners) : "—", tone: "neutral" },
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
            <ReportKpiCard label="Trades with Notes" delta={{ text: filtered.length > 0 ? `${Math.round((tradesWithNotes.length / filtered.length) * 100)}% of all trades` : "No data", tone: "neutral" }}>
              <span className="text-2xl font-bold text-foreground">{tradesWithNotes.length}</span>
            </ReportKpiCard>
            <ReportKpiCard label="Positive Notes" delta={{ text: "Confident / disciplined mentions", tone: "pos" }}>
              <span className="text-2xl font-bold text-success">{positiveNotes.length}</span>
            </ReportKpiCard>
            <ReportKpiCard label="Negative Notes" delta={{ text: "Fear / FOMO / emotional mentions", tone: "neg" }}>
              <span className="text-2xl font-bold text-destructive">{negativeNotes.length}</span>
            </ReportKpiCard>
            <ReportKpiCard label="Top Mistake" delta={{ text: topMistake ? `${topMistake.count} trades` : "No data", tone: "neg" }}>
              <span className="text-2xl font-bold text-destructive capitalize">{topMistake ? topMistake.trigger : "—"}</span>
            </ReportKpiCard>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ReportSectionCard title="Common Terms in Notes" subtitle="Psychology vocabulary frequency" className="col-span-2">
              {topWords.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add notes to your trades to build a word frequency analysis.</p>
              ) : (
                <ReportBarChart
                  data={topWords.slice(0, 8).map((w) => ({ label: w.word, value: w.count }))}
                  tooltipLabel="Mentions"
                  height="h-56 print:h-40"
                  emptyMessage="No notes yet."
                />
              )}
            </ReportSectionCard>
            <ReportSectionCard title="Emotional Triggers" subtitle="Avg P&L per trigger" className="col-span-1">
              {triggerAnalysis.length === 0 ? (
                <p className="text-sm text-muted-foreground">No emotional triggers found in notes.</p>
              ) : (
                <ReportBarChart
                  data={triggerAnalysis.slice(0, 6).map((t) => ({
                    label: t.trigger,
                    value: Math.round(t.avgPnl),
                    color: t.avgPnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))",
                  }))}
                  valueFormatter={(v) => fmtSigned(v)}
                  tooltipLabel="Avg P&L"
                  height="h-56 print:h-40"
                  emptyMessage="No triggers yet."
                />
              )}
            </ReportSectionCard>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ReportSectionCard title="Emotional Triggers vs Outcomes" subtitle="Full breakdown by trigger" className="col-span-2" noPadding>
              {triggerAnalysis.length === 0 ? (
                <p className="text-sm text-muted-foreground p-5">No emotional triggers found in notes.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-2 print:py-1 font-medium">Trigger</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">Occurrences</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">Avg P&L</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">Total P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {triggerAnalysis.map((t) => (
                      <tr key={t.trigger} className="border-b border-border last:border-0">
                        <td className="px-5 py-2 print:py-1 font-medium text-foreground capitalize">{t.trigger}</td>
                        <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{t.count}</td>
                        <td className={`px-5 py-2 print:py-1 text-right ${t.avgPnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {fmtSigned(Math.round(t.avgPnl))}
                        </td>
                        <td className={`px-5 py-2 print:py-1 text-right font-semibold ${t.totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {fmtSigned(t.totalPnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ReportSectionCard>

            <ReportSectionCard title="Improvement Focus" subtitle="This period's biggest opportunity" className="col-span-1">
              <p className="text-sm text-foreground">{improvementFocus}</p>
            </ReportSectionCard>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ReportSectionCard title="Most Confident Winning Trades" subtitle="4-5 star rated winners" className="col-span-2" noPadding>
              {confidentTrades.length === 0 ? (
                <p className="text-sm text-muted-foreground p-5">Rate your best trades 4-5 stars to track confident winners.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-2 print:py-1 font-medium">Date</th>
                      <th className="px-5 py-2 print:py-1 font-medium">Pair</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">Rating</th>
                      <th className="px-5 py-2 print:py-1 font-medium text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {confidentTrades.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-2 print:py-1 text-muted-foreground">{t.date}</td>
                        <td className="px-5 py-2 print:py-1 font-medium text-foreground">{t.pair ?? "—"}</td>
                        <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{"★".repeat(t.rating ?? 0)}</td>
                        <td className="px-5 py-2 print:py-1 text-right font-semibold text-success">{fmtSigned(t.pnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ReportSectionCard>

            <ReportSectionCard title="Hold-Time Analysis" subtitle="Winners vs losers" className="col-span-1">
              {!hasHoldData ? (
                <p className="text-sm text-muted-foreground">Add entry and exit times to see hold-time analysis.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 print:gap-1.5">
                  <div className="p-3 print:p-2 rounded-lg border border-success/20 bg-success/5">
                    <p className="text-[10px] text-muted-foreground">Avg Hold — Winners</p>
                    <p className="text-lg font-bold text-success">{formatMins(avgHoldWinners)}</p>
                  </div>
                  <div className="p-3 print:p-2 rounded-lg border border-destructive/20 bg-destructive/5">
                    <p className="text-[10px] text-muted-foreground">Avg Hold — Losers</p>
                    <p className="text-lg font-bold text-destructive">{formatMins(avgHoldLosers)}</p>
                  </div>
                </div>
              )}
            </ReportSectionCard>
          </div>
        </div>

        <ReportFooter generatedAt={generatedAt} accountLabel={accountLabel} reportId={reportId} />
      </ReportShell>
    </ReportThemeLock>
  );
}
