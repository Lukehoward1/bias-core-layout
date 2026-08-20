// src/components/reports/shell/ReportKpiCard.tsx
//
// One KPI tile for the report's metric strip — label, a big figure (passed
// as children so callers can drop in either a plain value or the existing
// three-mode <AccountAwareStat/>), and an optional delta sub-line.

import type { ReactNode } from "react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { CardFeatureGate, TierBadge } from "@/components/journal/FeatureGate";

interface PinState {
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

interface ReportKpiCardProps {
  label: string;
  children: ReactNode;
  delta?: { text: string; tone?: "pos" | "neg" | "neutral" };
  pin?: PinState;
  isLocked?: boolean;
  requiredPlan?: "standard" | "premium";
}

const deltaToneClass = (tone?: "pos" | "neg" | "neutral") => {
  if (tone === "pos") return "text-success";
  if (tone === "neg") return "text-destructive";
  return "text-muted-foreground";
};

export function ReportKpiCard({
  label,
  children,
  delta,
  pin,
  isLocked = false,
  requiredPlan = "standard",
}: ReportKpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 print:p-3 print:break-inside-avoid">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1" data-pdf-exclude>
          {isLocked && <TierBadge requiredPlan={requiredPlan} />}
          {!isLocked && pin && (
            <AddToDashboardButton isAdded={pin.isAdded} onAdd={pin.onAdd} onRemove={pin.onRemove} />
          )}
        </div>
      </div>
      <CardFeatureGate isLocked={isLocked} requiredPlan={requiredPlan}>
        {children}
        {delta && (
          <p className={`text-xs mt-1 ${deltaToneClass(delta.tone)}`}>{delta.text}</p>
        )}
      </CardFeatureGate>
    </div>
  );
}
