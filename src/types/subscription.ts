// Subscription plan types and limits configuration
// Keep limits centralized here for easy future adjustments

export type SubscriptionPlan = 'free' | 'standard' | 'premium';

export interface PlanLimits {
  // Brokerage connections
  maxLinkedAccounts: number;
  canLinkAccounts: boolean;
  
  // Journal features
  journal: {
    manualEntry: boolean;        // All plans
    viewTrades: boolean;         // All plans
    equityCurve: boolean;        // All plans
    analytics: boolean;          // Standard+
    reports: boolean;            // Standard+
    exportReports: boolean;      // Standard+
    autoJournaling: boolean;     // Standard+
    advancedComparisons: boolean; // Premium only
    deepAggregation: boolean;    // Premium only
  };
}

// Centralized plan limits configuration - easy to modify
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
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
  },
  standard: {
    maxLinkedAccounts: 2,
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
  premium: {
    maxLinkedAccounts: 5,
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

// Get limits for a specific plan
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

// Check if a plan allows linking more accounts
export function canLinkMoreAccounts(plan: SubscriptionPlan, currentCount: number): boolean {
  const limits = getPlanLimits(plan);
  if (!limits.canLinkAccounts) return false;
  return currentCount < limits.maxLinkedAccounts;
}

// Get remaining account slots for a plan
export function getRemainingAccountSlots(plan: SubscriptionPlan, currentCount: number): number {
  const limits = getPlanLimits(plan);
  if (!limits.canLinkAccounts) return 0;
  return Math.max(0, limits.maxLinkedAccounts - currentCount);
}

// Journal-specific permission checks
export function canAccessJournalAnalytics(plan: SubscriptionPlan): boolean {
  return getPlanLimits(plan).journal.analytics;
}

export function canAccessJournalReports(plan: SubscriptionPlan): boolean {
  return getPlanLimits(plan).journal.reports;
}

export function canExportJournalReports(plan: SubscriptionPlan): boolean {
  return getPlanLimits(plan).journal.exportReports;
}

export function canUseAutoJournaling(plan: SubscriptionPlan): boolean {
  return getPlanLimits(plan).journal.autoJournaling;
}

export function canAccessAdvancedComparisons(plan: SubscriptionPlan): boolean {
  return getPlanLimits(plan).journal.advancedComparisons;
}

export function canAccessDeepAggregation(plan: SubscriptionPlan): boolean {
  return getPlanLimits(plan).journal.deepAggregation;
}
