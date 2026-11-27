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
  // Track which user ID the current profile was fetched for. Lets us derive
  // isLoading synchronously on the render where user first becomes non-null,
  // before any useEffect has had a chance to run.
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [devTierOverride, setDevTierOverride] = useState<string | null>(null);

  const fetchProfile = useCallback(async (showLoading = true) => {
    // Auth not settled yet — isLoading already true via authLoading; wait for next call.
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setProfileUserId(null);
      setFetching(false);
      return;
    }
    if (showLoading) setFetching(true);
    let data: unknown = null;
    try {
      const res = await supabase
        .from("profiles")
        .select(
          "subscription_status,subscription_tier,is_founding_member,trial_ends_at,current_period_end,stripe_customer_id,downgrade_grace_end_at,downgrade_new_max",
        )
        .eq("id", user.id)
        .maybeSingle();
      data = res.data;
    } catch (err) {
      // A thrown network error must not leave the app on a permanent spinner.
      console.warn("[SubscriptionContext] profile fetch failed:", (err as Error).message);
    }
    setProfile(data as Profile | null);
    setProfileUserId(user.id);
    setFetching(false);
  // Depend on user.id (a string) rather than the user object so that a focus-triggered
  // token refresh — which replaces the session but keeps the same user ID — does not
  // recreate this callback, trigger the effect below, and re-fetch the profile.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  useEffect(() => {
    fetchProfile(true);
  }, [fetchProfile]);

  // isLoading is true in three situations:
  //   1. Auth hasn't resolved yet (we don't know who the user is).
  //   2. A profile fetch is in-flight.
  //   3. A signed-in user is present but their profile hasn't been fetched yet —
  //      the one-render window between user becoming non-null and the first effect firing.
  //      This is what prevents ProtectedRoute from seeing (user=X, isActive=false) and
  //      prematurely redirecting to /pricing on sign-in.
  const isLoading = authLoading || fetching || (user !== null && profileUserId !== user.id);

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
