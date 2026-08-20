// src/components/reports/shell/ReportSectionCard.tsx
//
// Titled card wrapper for a chart or table section of a report.

import type { ReactNode } from "react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { CardFeatureGate, TierBadge } from "@/components/journal/FeatureGate";

interface PinState {
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

interface ReportSectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  pin?: PinState;
  isLocked?: boolean;
  requiredPlan?: "standard" | "premium";
  /** Remove the content area's default padding — for tables that want full-bleed rows. */
  noPadding?: boolean;
  className?: string;
}

export function ReportSectionCard({
  title,
  subtitle,
  children,
  pin,
  isLocked = false,
  requiredPlan = "standard",
  noPadding = false,
  className = "",
}: ReportSectionCardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden print:break-inside-avoid ${className}`}>
      <div className="flex items-start justify-between px-5 py-4 print:py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0" data-pdf-exclude>
          {isLocked && <TierBadge requiredPlan={requiredPlan} />}
          {!isLocked && pin && (
            <AddToDashboardButton isAdded={pin.isAdded} onAdd={pin.onAdd} onRemove={pin.onRemove} />
          )}
        </div>
      </div>
      {/* Padding lives on this inner div (not CardFeatureGate's className) because
          CardFeatureGate renders children directly with no wrapper when unlocked —
          the common case — so a className passed to it would only ever apply
          while locked. */}
      <CardFeatureGate isLocked={isLocked} requiredPlan={requiredPlan}>
        <div className={noPadding ? "" : "p-5 print:p-4"}>{children}</div>
      </CardFeatureGate>
    </div>
  );
}
