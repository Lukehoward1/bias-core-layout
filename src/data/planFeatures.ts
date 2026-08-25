// src/data/planFeatures.ts
// Single source of truth for the Standard vs Pro feature matrix.
// Consumed by Pricing.tsx, ManageSubscription.tsx (comparison table), and
// CancelSubscription.tsx ("what you'll lose").

export interface PlanFeature {
  key: string;
  label: string;
  /** true/false for a plain has-it feature, or a string for a value-typed one ("1 broker account") */
  standard: boolean | string;
  pro: boolean | string;
  /** Convenience flag: this feature is Pro-only or a Pro-side upgrade (drives the Cancel page's loss list for Pro subscribers). */
  proOnly?: boolean;
}

export const PLAN_FEATURES: PlanFeature[] = [
  { key: "bias-engine",         label: "Live bias engine (all timeframes)", standard: true, pro: true },
  { key: "calendar",            label: "Economic calendar (filtered by pairs)", standard: true, pro: true },
  { key: "risk-tools",          label: "Risk tools & position calculator", standard: true, pro: true },
  { key: "journal",             label: "Trading journal with analytics", standard: true, pro: true },
  { key: "broker-accounts",     label: "Broker accounts", standard: "1", pro: "3" },
  { key: "education",           label: "Education library", standard: true, pro: true },
  { key: "alerts",              label: "Price & session alerts", standard: true, pro: true },
  { key: "broker-sync",         label: "Broker sync & auto-journaling", standard: false, pro: true, proOnly: true },
  { key: "advanced-analytics",  label: "Advanced analytics & reports", standard: false, pro: true, proOnly: true },
  { key: "deep-aggregation",    label: "Deep aggregation & comparisons", standard: false, pro: true, proOnly: true },
  { key: "priority-support",    label: "Priority support", standard: false, pro: true, proOnly: true },
  { key: "early-access",        label: "Early feature access", standard: false, pro: true, proOnly: true },
];

/** Features a subscriber will lose access to if they cancel from the given tier. */
export function featuresLostOnCancel(tier: "standard" | "pro" | "founding_member"): PlanFeature[] {
  if (tier === "standard") {
    // Standard user loses everything they currently have (all standard-side features).
    return PLAN_FEATURES.filter((f) => f.standard !== false);
  }
  // Pro and Founding Member users lose the full Pro feature set.
  return PLAN_FEATURES.filter((f) => f.pro !== false);
}
