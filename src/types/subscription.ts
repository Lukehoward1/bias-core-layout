// Subscription plan limits — keyed by the real backend tier values from
// profiles.subscription_tier (standard / pro / founding_member).

export interface PlanLimits {
  maxLinkedAccounts: number;
  canLinkAccounts: boolean;

  journal: {
    manualEntry: boolean;
    viewTrades: boolean;
    equityCurve: boolean;
    analytics: boolean;
    reports: boolean;
    exportReports: boolean;
    autoJournaling: boolean;
    advancedComparisons: boolean;
    deepAggregation: boolean;
  };
}

// Limits for each active subscription tier.
export const TIER_LIMITS: Record<string, PlanLimits> = {
  standard: {
    maxLinkedAccounts: 1,
    canLinkAccounts: true,
    journal: {
      manualEntry: true,
      viewTrades: true,
      equityCurve: true,
      analytics: true,
      reports: true,
      exportReports: true,
      autoJournaling: true,
      advancedComparisons: false,
      deepAggregation: false,
    },
  },
  pro: {
    maxLinkedAccounts: 3,
    canLinkAccounts: true,
    journal: {
      manualEntry: true,
      viewTrades: true,
      equityCurve: true,
      analytics: true,
      reports: true,
      exportReports: true,
      autoJournaling: true,
      advancedComparisons: true,
      deepAggregation: true,
    },
  },
  founding_member: {
    maxLinkedAccounts: 1,
    canLinkAccounts: true,
    journal: {
      manualEntry: true,
      viewTrades: true,
      equityCurve: true,
      analytics: true,
      reports: true,
      exportReports: true,
      autoJournaling: true,
      advancedComparisons: true,
      deepAggregation: true,
    },
  },
};

// Limits when the user has no active subscription or an unknown tier.
export const FREE_LIMITS: PlanLimits = {
  maxLinkedAccounts: 0,
  canLinkAccounts: false,
  journal: {
    manualEntry: true,
    viewTrades: true,
    equityCurve: true,
    analytics: false,
    reports: false,
    exportReports: false,
    autoJournaling: false,
    advancedComparisons: false,
    deepAggregation: false,
  },
};

// Returns the correct PlanLimits for a given tier and subscription status.
// status must be "active" or "trialing" for any paid features to unlock.
export function getTierLimits(tier: string | null, status: string | null): PlanLimits {
  if (status !== "active" && status !== "trialing") return FREE_LIMITS;
  return TIER_LIMITS[tier ?? ""] ?? FREE_LIMITS;
}
