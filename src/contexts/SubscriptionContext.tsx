import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { type PlanLimits, getTierLimits } from "@/types/subscription";

interface Profile {
  subscription_status: string | null;
  subscription_tier: string | null;
  is_founding_member: boolean;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  downgrade_grace_end_at: string | null;
  downgrade_new_max: number | null;
}

interface SubscriptionContextValue {
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  isFoundingMember: boolean;
  isActive: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  downgradeGraceEndAt: string | null;
  downgradeNewMax: number | null;
  limits: PlanLimits;
  isLoading: boolean;
  refetch: () => Promise<void>;
  // Dev-only: override the active tier without touching the DB.
  // Has no effect in production since the UI is gated by import.meta.env.DEV.
  setDevTier: (tier: string | null) => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devTierOverride, setDevTierOverride] = useState<string | null>(null);

  const fetchProfile = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select(
        "subscription_status,subscription_tier,is_founding_member,trial_ends_at,current_period_end,stripe_customer_id,downgrade_grace_end_at,downgrade_new_max",
      )
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile(true);
  }, [fetchProfile]);

  const realStatus = profile?.subscription_status ?? null;
  const realTier = profile?.subscription_tier ?? null;

  // Dev override: when set, treat the subscription as active with the chosen tier.
  const effectiveTier = devTierOverride ?? realTier;
  const effectiveStatus = devTierOverride ? "active" : realStatus;

  const now = new Date();
  const isActive = effectiveStatus === "active" || effectiveStatus === "trialing";
  const isTrial =
    effectiveStatus === "trialing" &&
    !!profile?.trial_ends_at &&
    new Date(profile.trial_ends_at) > now;

  const limits = useMemo(
    () => getTierLimits(effectiveTier, effectiveStatus),
    [effectiveTier, effectiveStatus],
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptionStatus: effectiveStatus,
        subscriptionTier: effectiveTier,
        isFoundingMember: profile?.is_founding_member ?? false,
        isActive,
        isTrial,
        trialEndsAt: profile?.trial_ends_at ?? null,
        currentPeriodEnd: profile?.current_period_end ?? null,
        stripeCustomerId: profile?.stripe_customer_id ?? null,
        downgradeGraceEndAt: profile?.downgrade_grace_end_at ?? null,
        downgradeNewMax: profile?.downgrade_new_max ?? null,
        limits,
        isLoading,
        refetch: () => fetchProfile(false),
        setDevTier: (tier: string | null) => {
          if (import.meta.env.DEV) setDevTierOverride(tier);
        },
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
