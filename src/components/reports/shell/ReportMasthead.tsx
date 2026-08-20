// src/components/reports/shell/ReportMasthead.tsx
//
// Light masthead that reads as part of the same document as the white report
// body, rather than a contrasting dark banner — a thin brand-cyan accent line
// along the bottom is what marks it as a header band. Renders inside
// ReportThemeLock, so semantic classes (text-foreground, text-success, etc.)
// resolve against the locked light-mode tokens and stay identical regardless
// of the app's active light/dark theme.

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
  if (tone === "pos") return "text-success";
  if (tone === "neg") return "text-destructive";
  return "text-foreground";
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
      className="rounded-t-2xl px-6 py-5 print:py-4 bg-background border-b-2"
      style={{ borderBottomColor: "#06b6d4" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Wordmark + report title + period */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <img src={sbLogo} alt="StreamBias" className="h-8 w-auto" />
            <span className="text-foreground font-bold text-lg tracking-tight">StreamBias</span>
          </div>
          <span className="text-muted-foreground/40 hidden sm:inline">|</span>
          <span className="text-foreground/80 font-semibold uppercase tracking-wide text-sm">
            {reportTitle}
          </span>
          <span className="inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {periodLabel}
          </span>
          {accountLabel && (
            <span className="text-xs text-muted-foreground/70">{accountLabel}</span>
          )}
        </div>

        {/* Hero metric strip + actions, grouped on the right */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {heroMetrics.map((m, i) => (
              <div
                key={m.label}
                className={i > 0 ? "pl-5 border-l border-border" : ""}
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
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
