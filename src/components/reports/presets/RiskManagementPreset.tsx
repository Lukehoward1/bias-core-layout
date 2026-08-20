// src/components/reports/presets/RiskManagementPreset.tsx

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
import { calculateTradeRisk } from "@/lib/risk-calculations";
import type { PresetProps, PresetTrade } from "./types";

const fmtSigned = (v: number, sym = "£") =>
  `${v >= 0 ? "+" : "-"}${sym}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function buildRiskStats(ts: PresetTrade[]) {
  const tradeRisks = ts.map((t) => ({
    trade: t,
    risk: calculateTradeRisk(t.entry ?? 0, t.stopLoss, t.lots ?? 0, t.pair ?? ""),
  }));
  const withRisk = tradeRisks.filter((r) => r.risk !== null) as { trade: PresetTrade; risk: number }[];
  const risks = withRisk.map((r) => r.risk);
  const avgRisk = risks.length > 0 ? risks.reduce((a, b) => a + b, 0) / risks.length : 0;
  const maxRisk = risks.length > 0 ? Math.max(...risks) : 0;
  const losingTrades = ts.filter((t) => t.pnl < 0);
  const maxLoss = losingTrades.length > 0 ? Math.max(...losingTrades.map((t) => Math.abs(t.pnl))) : 0;
  const totalLoss = losingTrades.reduce((s, t) => s + Math.abs(t.pnl), 0);

  const riskBuckets = [
    { range: "0-50", count: risks.filter((r) => r <= 50).length },
    { range: "50-100", count: risks.filter((r) => r > 50 && r <= 100).length },
    { range: "100-150", count: risks.filter((r) => r > 100 && r <= 150).length },
    { range: "150-200", count: risks.filter((r) => r > 150 && r <= 200).length },
    { range: "200+", count: risks.filter((r) => r > 200).length },
  ];

  let score = 100;
  const variance = risks.length > 0 ? risks.reduce((acc, r) => acc + Math.pow(r - avgRisk, 2), 0) / risks.length : 0;
  if (variance > 2000) score -= 15;
  else if (variance > 1000) score -= 10;
  if (variance < 500) score += 5;
  const disciplineScore = Math.max(0, Math.min(100, score));

  return { risks, withRisk, avgRisk, maxRisk, maxLoss, totalLoss, losingTrades, riskBuckets, disciplineScore, coverage: withRisk.length };
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Improvement";
  return "Poor";
}

export function RiskManagementPreset({
  trades: filtered,
  reportTitle,
  periodLabel,
  accountLabel,
  generatedAt,
  reportId,
  onPrint,
}: PresetProps) {
  const stats = useMemo(() => buildRiskStats(filtered), [filtered]);

  const heroMetrics: HeroMetric[] = [
    { label: "Avg Risk/Trade", value: stats.risks.length > 0 ? fmtSigned(stats.avgRisk).replace("+", "") : "—", tone: "neutral" },
    { label: "Max Risk Taken", value: stats.risks.length > 0 ? fmtSigned(stats.maxRisk).replace("+", "") : "—", tone: "neutral" },
    { label: "Discipline Score", value: `${stats.disciplineScore}/100`, tone: stats.disciplineScore >= 60 ? "pos" : "neg" },
    { label: "Max Single Loss", value: stats.losingTrades.length > 0 ? `-${fmtSigned(stats.maxLoss).replace("+", "")}` : "—", tone: "neg" },
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
          <div className="grid grid-cols-4 gap-4">
            <ReportKpiCard label="Avg Risk/Trade" delta={{ text: `${stats.coverage} of ${filtered.length} trades with a stop loss`, tone: "neutral" }}>
              <span className="text-2xl font-bold text-foreground">{stats.risks.length > 0 ? fmtSigned(stats.avgRisk).replace("+", "") : "—"}</span>
            </ReportKpiCard>
            <ReportKpiCard label="Max Risk Taken" delta={{ text: "Largest single position risk", tone: "neutral" }}>
              <span className="text-2xl font-bold text-foreground">{stats.risks.length > 0 ? fmtSigned(stats.maxRisk).replace("+", "") : "—"}</span>
            </ReportKpiCard>
            <ReportKpiCard label="Max Single Loss" delta={{ text: `${stats.losingTrades.length} losing trades`, tone: "neg" }}>
              <span className="text-2xl font-bold text-destructive">-{fmtSigned(stats.maxLoss).replace("+", "")}</span>
            </ReportKpiCard>
            <ReportKpiCard label="Total Losses" delta={{ text: "Realized this period", tone: "neg" }}>
              <span className="text-2xl font-bold text-destructive">-{fmtSigned(stats.totalLoss).replace("+", "")}</span>
            </ReportKpiCard>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ReportSectionCard title="Risk Distribution per Trade" subtitle="Position risk grouped into bands" className="col-span-2">
              <ReportBarChart
                data={stats.riskBuckets.map((b) => ({ label: b.range, value: b.count }))}
                tooltipLabel="Trades"
                height="h-56 print:h-40"
                emptyMessage="No stop-loss data yet."
              />
            </ReportSectionCard>
            <ReportSectionCard title="Risk Discipline Score" subtitle="Consistency of position sizing" className="col-span-1">
              <div className="flex flex-col items-center justify-center h-full text-center py-4 print:py-2">
                <span className={`text-4xl font-bold ${stats.disciplineScore >= 60 ? "text-success" : "text-destructive"}`}>
                  {stats.disciplineScore}
                </span>
                <span className={`text-sm font-semibold mt-1 ${stats.disciplineScore >= 60 ? "text-success" : "text-destructive"}`}>
                  {getScoreLabel(stats.disciplineScore)}
                </span>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {stats.disciplineScore >= 80
                    ? "Outstanding risk management discipline."
                    : stats.disciplineScore >= 60
                      ? "Good discipline, minor improvements possible."
                      : "Focus on consistent position sizing and risk limits."}
                </p>
              </div>
            </ReportSectionCard>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ReportSectionCard title="Trades Exceeding Planned Risk" subtitle="Above 2% of account balance" className="col-span-2">
              <p className="text-sm text-muted-foreground">
                Set an account balance in Settings to enable 2%-of-balance threshold detection for this report.
              </p>
            </ReportSectionCard>

            <ReportSectionCard title="Risk Coverage" subtitle="Stop-loss data completeness" className="col-span-1">
              <div className="space-y-2 print:space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Trades with stop loss</span>
                  <span className="font-semibold text-foreground">{stats.coverage} / {filtered.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Losing trades</span>
                  <span className="font-semibold text-destructive">{stats.losingTrades.length}</span>
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
