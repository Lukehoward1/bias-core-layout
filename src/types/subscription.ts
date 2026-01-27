// Subscription plan types and limits configuration
// Keep limits centralized here for easy future adjustments

export type SubscriptionPlan = 'free' | 'standard' | 'premium';

export interface PlanLimits {
  maxLinkedAccounts: number;
  canLinkAccounts: boolean;
}

// Centralized plan limits configuration - easy to modify
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxLinkedAccounts: 0,
    canLinkAccounts: false,
  },
  standard: {
    maxLinkedAccounts: 2,
    canLinkAccounts: true,
  },
  premium: {
    maxLinkedAccounts: 5,
    canLinkAccounts: true,
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
