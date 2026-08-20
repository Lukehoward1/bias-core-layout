// src/components/reports/presets/PerformancePreset.tsx

import { useMemo } from "react";
import {
  ReportThemeLock,
  ReportShell,
  ReportMasthead,
  ReportKpiCard,
  ReportSectionCard,
  ReportDonut,
  ReportBarChart,
  ReportFooter,
  type HeroMetric,
} from "../shell";
import type { PresetProps } from "./types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DURATION_BUCKETS = [
  { key: "scalp", label: "Scalp (<1h)", min: 0, max: 59 },
  { key: "intraday", label: "Intraday (1-8h)", min: 60, max: 480 },
  { key: "swing", label: "Swing (>8h)", min: 481, max: Infinity },
];

const fmtSigned = (v: number, sym = "£") =>
  `${v >= 0 ? "+" : "-"}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** Minimum trades in a day bucket before it's eligible for "Best Day" — avoids
 * a single lucky trade on a quiet day claiming a misleading 100%. */
const MIN_TRADES_FOR_BEST_DAY = 2;

export function PerformancePreset({
  trades: filtered,
  reportTitle,
  periodLabel,
  accountLabel,
  generatedAt,
  reportId,
  onPrint,
}: PresetProps) {
  const dayStats = useMemo(
    () =>
      DAYS.map((day, idx) => {
        const dt = filtered.filter((t) => new Date(t.date + "T12:00:00").getDay() === idx);
        const wins = dt.filter((t) => t.status === "win").length;
        return { day, winRate: dt.length > 0 ? Math.round((wins / dt.length) * 100) : 0, trades: dt.length };
      }),
    [filtered],
  );

  const bestDay = useMemo(() => {
    const eligible = dayStats.filter((d) => d.trades >= MIN_TRADES_FOR_BEST_DAY);
    if (eligible.length === 0) return null;
    return eligible.reduce((best, d) => (d.winRate > best.winRate ? d : best), eligible[0]);
  }, [dayStats]);

  const mostActiveDay = useMemo(() => {
    if (dayStats.every((d) => d.trades === 0)) return null;
    return dayStats.reduce((most, d) => (d.trades > most.trades ? d : most), dayStats[0]);
  }, [dayStats]);

  const longTrades = filtered.filter((t) => t.type === "Long");
  const shortTrades = filtered.filter((t) => t.type === "Short");

  const timedTrades = useMemo(
    () =>
      filtered
        .filter((t) => t.entryTime && t.exitTime)
        .map((t) => {
          const [eh, em] = t.entryTime!.split(":").map(Number);
          const [xh, xm] = t.exitTime!.split(":").map(Number);
          const entryMins = eh * 60 + em;
          let exitMins = xh * 60 + xm;
          if (exitMins < entryMins) exitMins += 24 * 60;
          return { ...t, holdMins: exitMins - entryMins };
        }),
    [filtered],
  );
  const hasHoldData = timedTrades.length > 0;
  const holdWinners = timedTrades.filter((t) => t.status === "win");
  const holdLosers = timedTrades.filter((t) => t.status === "loss");
  const avgHoldWinnersH = holdWinners.length > 0
    ? holdWinners.reduce((s, t) => s + t.holdMins, 0) / holdWinners.length / 60 : 0;
  const avgHoldLosersH = holdLosers.length > 0
    ? holdLosers.reduce((s, t) => s + t.holdMins, 0) / holdLosers.length / 60 : 0;

  const durationPnl = useMemo(
    () =>
      DURATION_BUCKETS.map((b) => {
        const bucket = timedTrades.filter((t) => t.holdMins >= b.min && t.holdMins <= b.max);
        return { ...b, pnl: bucket.reduce((s, t) => s + t.pnl, 0), trades: bucket.length };
      }),
    [timedTrades],
  );
  const bestDuration = hasHoldData
    ? durationPnl.reduce((best, b) => (b.pnl > best.pnl ? b : best), durationPnl[0])
    : null;

  const monthlyPnl = useMemo(() => {
    const byMonth = filtered.reduce((acc, t) => {
      const month = new Date(t.date + "T12:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      if (!acc[month]) acc[month] = { month, pnl: 0, trades: 0 };
      acc[month].pnl += t.pnl;
      acc[month].trades += 1;
      return acc;
    }, {} as Record<string, { month: string; pnl: number; trades: number }>);
    return Object.values(byMonth);
  }, [filtered]);

  const heroMetrics: HeroMetric[] = [
    { label: "Best Day", value: bestDay ? `${bestDay.day} — ${bestDay.winRate}%` : "—", tone: "neutral" },
    { label: "Long / Short", value: `${longTrades.length} / ${shortTrades.length}`, tone: "neutral" },
    { label: "Avg Hold (Win)", value: hasHoldData ? `${avgHoldWinnersH.toFixed(1)}h` : "—", tone: "neutral" },
    { label: "Best Duration", value: bestDuration ? bestDuration.label.split(" ")[0] : "—", tone: "pos" },
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
            <ReportKpiCard label="Trade Direction" delta={{ text: "Long / Short trades", tone: "neutral" }}>
              <span className="text-2xl font-bold text-foreground">{longTrades.length} / {shortTrades.length}</span>
            </ReportKpiCard>
            <ReportKpiCard label="Avg Hold Time" delta={{ text: "Winners / Losers", tone: "neutral" }}>
              <span className="text-2xl font-bold text-foreground">
                {hasHoldData ? `${avgHoldWinnersH.toFixed(1)}h / ${avgHoldLosersH.toFixed(1)}h` : "—"}
              </span>
            </ReportKpiCard>
            <ReportKpiCard label="Best Trading Day" delta={{ text: bestDay ? `${bestDay.trades} trades that day` : "Not enough data", tone: "neutral" }}>
              <span className="text-2xl font-bold text-success">{bestDay ? `${bestDay.day} (${bestDay.winRate}%)` : "—"}</span>
            </ReportKpiCard>
            <ReportKpiCard label="Most Active Day" delta={{ text: "By trade count", tone: "neutral" }}>
              <span className="text-2xl font-bold text-foreground">{mostActiveDay ? `${mostActiveDay.day} (${mostActiveDay.trades})` : "—"}</span>
            </ReportKpiCard>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ReportSectionCard title="Win Rate by Day" subtitle="Profit rate across the trading week" className="col-span-2">
              <ReportBarChart
                data={dayStats.map((d) => ({ label: d.day, value: d.winRate }))}
                unit="%"
                tooltipLabel="Win Rate"
                height="h-56 print:h-40"
                emptyMessage="No trades in this period."
              />
            </ReportSectionCard>
            <ReportSectionCard title="Long / Short Split" subtitle={`${filtered.length} trades in period`} className="col-span-1">
              <ReportDonut
                data={[
                  { name: "Long", value: longTrades.length, color: "hsl(var(--success))" },
                  { name: "Short", value: shortTrades.length, color: "hsl(var(--destructive))" },
                ]}
                centerValue={filtered.length > 0 ? `${Math.round((longTrades.length / filtered.length) * 100)}%` : "—"}
                centerLabel="Long"
                emptyMessage="No trades yet."
              />
            </ReportSectionCard>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ReportSectionCard title="Monthly Performance Heatmap" subtitle="Net P&L by calendar month" className="col-span-2">
              {monthlyPnl.length === 0 ? (
                <p className="text-sm text-muted-foreground">No closed trades in this period.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 print:gap-1.5">
                  {monthlyPnl.map((m) => (
                    <div
                      key={m.month}
                      className={`p-3 print:p-2 rounded-lg text-center border ${
                        m.pnl >= 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
                      }`}
                    >
                      <p className="text-xs text-muted-foreground">{m.month}</p>
                      <p className={`text-sm font-bold ${m.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                        {fmtSigned(m.pnl)}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.trades} trades</p>
                    </div>
                  ))}
                </div>
              )}
            </ReportSectionCard>

            <ReportSectionCard title="P&L by Trade Duration" subtitle="Net P&L by hold-time bucket" className="col-span-1">
              {!hasHoldData ? (
                <p className="text-sm text-muted-foreground">Add entry/exit times to trades to see this breakdown.</p>
              ) : (
                <ReportBarChart
                  data={durationPnl.map((b) => ({
                    label: b.label.split(" ")[0],
                    value: b.pnl,
                    color: b.pnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))",
                  }))}
                  valueFormatter={(v) => fmtSigned(v)}
                  tooltipLabel="P&L"
                  height="h-56 print:h-40"
                  emptyMessage="No timed trades in this period."
                />
              )}
            </ReportSectionCard>
          </div>
        </div>

        <ReportFooter generatedAt={generatedAt} accountLabel={accountLabel} reportId={reportId} />
      </ReportShell>
    </ReportThemeLock>
  );
}
