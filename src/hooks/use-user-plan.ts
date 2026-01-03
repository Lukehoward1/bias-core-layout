import { useState, useCallback } from 'react';

export type UserPlan = 'preview' | 'standard' | 'premium';

interface UserPlanState {
  plan: UserPlan;
  setPlan: (plan: UserPlan) => void;
  isPreview: boolean;
  isStandard: boolean;
  isPremium: boolean;
  hasReportsAccess: boolean;
  hasAnalyticsAccess: boolean;
  hasExportAccess: boolean;
}

const PLAN_STORAGE_KEY = 'streambias-user-plan';

export function useUserPlan(): UserPlanState {
  const [plan, setPlanState] = useState<UserPlan>(() => {
    if (typeof window === 'undefined') return 'preview';
    const stored = localStorage.getItem(PLAN_STORAGE_KEY);
    if (stored === 'standard' || stored === 'premium' || stored === 'preview') {
      return stored;
    }
    return 'preview';
  });

  const setPlan = useCallback((newPlan: UserPlan) => {
    setPlanState(newPlan);
    localStorage.setItem(PLAN_STORAGE_KEY, newPlan);
  }, []);

  const isPreview = plan === 'preview';
  const isStandard = plan === 'standard';
  const isPremium = plan === 'premium';

  // Feature access based on plan
  const hasReportsAccess = isStandard || isPremium;
  const hasAnalyticsAccess = isStandard || isPremium;
  const hasExportAccess = isStandard || isPremium;

  return {
    plan,
    setPlan,
    isPreview,
    isStandard,
    isPremium,
    hasReportsAccess,
    hasAnalyticsAccess,
    hasExportAccess,
  };
}
