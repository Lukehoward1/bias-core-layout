// src/components/reports/shell/ReportMasthead.tsx
//
// Fixed dark masthead — deliberately NOT theme-locked to the light document
// tokens. It's a brand header (like a tearsheet's letterhead) so it stays a
// constant near-black regardless of the report body's palette.

import type { ReactNode } from "react";
import sbLogo from "@/assets/sb-logo.svg";

export interface HeroMetric {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neutral";
}

interface ReportMastheadProps {
  reportTitle: string;
  periodLabel: string;
  accountLabel?: string;
  heroMetrics: HeroMetric[];
  /** Optional right-aligned slot for controls (export button etc). Hidden in PDF capture via data-pdf-exclude on the caller. */
  actions?: ReactNode;
}

const toneClass = (tone: HeroMetric["tone"]) => {
  if (tone === "pos") return "text-emerald-400";
  if (tone === "neg") return "text-red-400";
  return "text-white";
};

export function ReportMasthead({
  reportTitle,
  periodLabel,
  accountLabel,
  heroMetrics,
  actions,
}: ReportMastheadProps) {
  return (
    <div
      className="rounded-t-2xl px-6 py-5 print:py-4"
      style={{
        background: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Wordmark + report title + period */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <img src={sbLogo} alt="StreamBias" className="h-8 w-auto" />
            <span className="text-white font-bold text-lg tracking-tight">StreamBias</span>
          </div>
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <span className="text-zinc-200 font-semibold uppercase tracking-wide text-sm">
            {reportTitle}
          </span>
          <span className="inline-flex items-center rounded-full bg-zinc-800/80 border border-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
            {periodLabel}
          </span>
          {accountLabel && (
            <span className="text-xs text-zinc-500">{accountLabel}</span>
          )}
        </div>

        {/* Hero metric strip + actions, grouped on the right */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {heroMetrics.map((m, i) => (
              <div
                key={m.label}
                className={i > 0 ? "pl-5 border-l border-zinc-800" : ""}
              >
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {m.label}
                </div>
                <div className={`text-sm font-bold ${toneClass(m.tone)}`}>{m.value}</div>
              </div>
            ))}
          </div>
          {actions && <div data-pdf-exclude>{actions}</div>}
        </div>
      </div>
    </div>
  );
}
