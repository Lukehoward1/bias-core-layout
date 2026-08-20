// src/components/reports/presets/SessionsPreset.tsx

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
import type { PresetProps } from "./types";

const SESSION_DEFS = [
  { name: "Asia", hours: "00:00 – 06:59 UTC", min: 0, max: 6 },
  { name: "London", hours: "07:00 – 11:59 UTC", min: 7, max: 11 },
  { name: "Overlap", hours: "12:00 – 15:59 UTC", min: 12, max: 15 },
  { name: "New York", hours: "16:00 – 20:59 UTC", min: 16, max: 20 },
  { name: "Sydney/Late", hours: "21:00 – 23:59 UTC", min: 21, max: 23 },
];

const fmtSigned = (v: number, sym = "£") =>
  `${v >= 0 ? "+" : "-"}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function SessionsPreset({
  trades: filtered,
  reportTitle,
  periodLabel,
  accountLabel,
  generatedAt,
  reportId,
  onPrint,
}: PresetProps) {
  const timedTrades = useMemo(() => filtered.filter((t) => t.entryTime), [filtered]);
  const hasTimeData = timedTrades.length > 0;

  const sessionData = useMemo(
    () =>
      SESSION_DEFS.map((def) => {
        const sessionTrades = timedTrades.filter((t) => {
          const hour = parseInt(t.entryTime!.split(":")[0], 10);
          return hour >= def.min && hour <= def.max;
        });
        const wins = sessionTrades.filter((t) => t.status === "win");
        const losses = sessionTrades.filter((t) => t.status === "loss");
        const pnl = sessionTrades.reduce((s, t) => s + t.pnl, 0);
        const avgWinVal = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
        const avgLossVal = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 1;
        return {
          name: def.name,
          hours: def.hours,
          trades: sessionTrades.length,
          pnl,
          winRate: sessionTrades.length > 0 ? Math.round((wins.length / sessionTrades.length) * 100) : 0,
          avgRR: avgLossVal > 0 ? avgWinVal / avgLossVal : 0,
        };
      }).filter((s) => s.trades > 0),
    [timedTrades],
  );

  const strongest = sessionData.length > 0
    ? sessionData.reduce((best, s) => (s.pnl > best.pnl ? s : best), sessionData[0])
    : null;
  const weakest = sessionData.length > 0
    ? sessionData.reduce((worst, s) => (s.pnl < worst.pnl ? s : worst), sessionData[0])
    : null;
  const mostActive = sessionData.length > 0
    ? sessionData.reduce((most, s) => (s.trades > most.trades ? s : most), sessionData[0])
    : null;
  const bestRR = sessionData.length > 0
    ? sessionData.reduce((best, s) => (s.avgRR > best.avgRR ? s : best), sessionData[0])
    : null;

  const heroMetrics: HeroMetric[] = [
    { label: "Strongest Session", value: strongest ? `${strongest.name} — ${strongest.winRate}%` : "—", tone: "pos" },
    { label: "Weakest Session", value: weakest ? `${weakest.name} — ${weakest.winRate}%` : "—", tone: "neg" },
    { label: "Most Active", value: mostActive ? `${mostActive.name} (${mostActive.trades})` : "—", tone: "neutral" },
    { label: "Sessions Active", value: `${sessionData.length}/${SESSION_DEFS.length}`, tone: "neutral" },
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
          {!hasTimeData ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Add entry times to your trades to see session analysis.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4">
                <ReportKpiCard label="Strongest Session" delta={{ text: strongest ? `${strongest.winRate}% win rate` : "No data", tone: "pos" }}>
                  <span className="text-2xl font-bold text-success">{strongest ? strongest.name : "—"}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Weakest Session" delta={{ text: weakest ? `${weakest.winRate}% win rate` : "No data", tone: "neg" }}>
                  <span className="text-2xl font-bold text-destructive">{weakest ? weakest.name : "—"}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Most Active Session" delta={{ text: mostActive ? `${mostActive.trades} trades` : "No data", tone: "neutral" }}>
                  <span className="text-2xl font-bold text-foreground">{mostActive ? mostActive.name : "—"}</span>
                </ReportKpiCard>
                <ReportKpiCard label="Best Avg R:R" delta={{ text: bestRR ? `R:R ${bestRR.avgRR.toFixed(1)}` : "No data", tone: "neutral" }}>
                  <span className="text-2xl font-bold text-foreground">{bestRR ? bestRR.name : "—"}</span>
                </ReportKpiCard>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <ReportSectionCard title="Win Rate by Session" subtitle="Profit rate across trading sessions" className="col-span-2">
                  <ReportBarChart
                    data={sessionData.map((s) => ({ label: s.name, value: s.winRate }))}
                    unit="%"
                    tooltipLabel="Win Rate"
                    height="h-56 print:h-40"
                    emptyMessage="No session data yet."
                  />
                </ReportSectionCard>
                <ReportSectionCard title="P&L by Session" subtitle="Net P&L per session" className="col-span-1">
                  <ReportBarChart
                    data={sessionData.map((s) => ({
                      label: s.name,
                      value: s.pnl,
                      color: s.pnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))",
                    }))}
                    valueFormatter={(v) => fmtSigned(v)}
                    tooltipLabel="P&L"
                    height="h-56 print:h-40"
                    emptyMessage="No session data yet."
                  />
                </ReportSectionCard>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <ReportSectionCard title="Session Breakdown" subtitle="Full stats by trading session" className="col-span-2" noPadding>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-5 py-2 print:py-1 font-medium">Session</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Trades</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Win Rate</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">Avg R:R</th>
                        <th className="px-5 py-2 print:py-1 font-medium text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionData.map((s) => (
                        <tr key={s.name} className="border-b border-border last:border-0">
                          <td className="px-5 py-2 print:py-1">
                            <div className="font-medium text-foreground">{s.name}</div>
                            <div className="text-[10px] text-muted-foreground">{s.hours}</div>
                          </td>
                          <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{s.trades}</td>
                          <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{s.winRate}%</td>
                          <td className="px-5 py-2 print:py-1 text-right text-muted-foreground">{s.avgRR.toFixed(1)}</td>
                          <td className={`px-5 py-2 print:py-1 text-right font-semibold ${s.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {fmtSigned(s.pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ReportSectionCard>

                <ReportSectionCard title="Recommendations" subtitle="Where to lean in or pull back" className="col-span-1">
                  <div className="space-y-2 print:space-y-1.5">
                    {strongest && (
                      <div className="p-3 print:p-2 rounded-lg border border-success/30 bg-success/5">
                        <p className="text-xs font-semibold text-success">Trade More</p>
                        <p className="text-xs font-medium text-foreground mt-0.5">{strongest.name} Session</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {strongest.winRate}% win rate · {fmtSigned(strongest.pnl)} P&L
                        </p>
                      </div>
                    )}
                    {weakest && weakest.name !== strongest?.name && (
                      <div className="p-3 print:p-2 rounded-lg border border-destructive/30 bg-destructive/5">
                        <p className="text-xs font-semibold text-destructive">Reduce Exposure</p>
                        <p className="text-xs font-medium text-foreground mt-0.5">{weakest.name} Session</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {weakest.winRate}% win rate · {fmtSigned(weakest.pnl)} P&L
                        </p>
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
