import { useState, useEffect, useCallback } from 'react';
import { SubscriptionPlan, getPlanLimits, PlanLimits } from '@/types/subscription';

const STORAGE_KEY = 'userSubscriptionPlan';

interface UseSubscriptionReturn {
  plan: SubscriptionPlan;
  limits: PlanLimits;
  isLoading: boolean;
  // For testing purposes - will be replaced with real auth/billing integration
  setPlan: (plan: SubscriptionPlan) => void;
}

// Default to 'premium' for development/testing until billing is integrated
const DEFAULT_PLAN: SubscriptionPlan = 'premium';

export function useSubscription(): UseSubscriptionReturn {
  const [plan, setPlanState] = useState<SubscriptionPlan>(DEFAULT_PLAN);
  const [isLoading, setIsLoading] = useState(true);

  // Load plan from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ['free', 'standard', 'premium'].includes(saved)) {
        setPlanState(saved as SubscriptionPlan);
      }
    } catch (error) {
      console.error('Failed to load subscription plan:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update plan (for testing - will integrate with billing later)
  const setPlan = useCallback((newPlan: SubscriptionPlan) => {
    setPlanState(newPlan);
    localStorage.setItem(STORAGE_KEY, newPlan);
  }, []);

  return {
    plan,
    limits: getPlanLimits(plan),
    isLoading,
    setPlan,
  };
}
