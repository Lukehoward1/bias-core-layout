import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  subscription_status: string | null;
  subscription_tier: string | null;
  is_founding_member: boolean;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
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
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select(
        "subscription_status,subscription_tier,is_founding_member,trial_ends_at,current_period_end,stripe_customer_id",
      )
      .eq("id", user.id)
      .single();
    setProfile(data as Profile | null);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    fetchProfile();
  }, [fetchProfile]);

  const status = profile?.subscription_status ?? null;
  const now = new Date();

  const isActive = status === "active" || status === "trialing";
  const isTrial =
    status === "trialing" &&
    !!profile?.trial_ends_at &&
    new Date(profile.trial_ends_at) > now;

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptionStatus: status,
        subscriptionTier: profile?.subscription_tier ?? null,
        isFoundingMember: profile?.is_founding_member ?? false,
        isActive,
        isTrial,
        trialEndsAt: profile?.trial_ends_at ?? null,
        currentPeriodEnd: profile?.current_period_end ?? null,
        stripeCustomerId: profile?.stripe_customer_id ?? null,
        isLoading,
        refetch: fetchProfile,
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
