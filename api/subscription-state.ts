// api/subscription-state.ts
// Returns the caller's current Stripe subscription state — read live from Stripe
// so pages don't have to reason about Supabase/Stripe sync. Used by
// ManageSubscription.tsx on mount to render the current plan, pending scheduled
// change (if any), cancel_at_period_end status, and next renewal date.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { PRICE_IDS } from "../src/lib/stripe.js";

export interface SubscriptionState {
  tier: "standard" | "pro" | "founding_member" | null;
  cadence: "monthly" | "annual" | null;
  currentPriceId: string | null;
  status: string | null;
  isFoundingMember: boolean;
  currentPeriodEnd: string | null;      // ISO
  cancelAtPeriodEnd: boolean;
  pendingChange: {
    scheduleId: string;
    newPriceId: string;
    newTier: "standard" | "pro";
    effectiveAt: string;                 // ISO
  } | null;
}

function tierFromPriceId(priceId: string): "standard" | "pro" | "founding_member" | null {
  const {
    STANDARD_MONTHLY, STANDARD_ANNUAL,
    PRO_MONTHLY, PRO_ANNUAL,
    FOUNDING_MEMBER,
  } = PRICE_IDS;
  if (priceId === FOUNDING_MEMBER) return "founding_member";
  if (priceId === PRO_MONTHLY || priceId === PRO_ANNUAL) return "pro";
  if (priceId === STANDARD_MONTHLY || priceId === STANDARD_ANNUAL) return "standard";
  return null;
}

function cadenceFromPriceId(priceId: string): "monthly" | "annual" | null {
  const { STANDARD_MONTHLY, PRO_MONTHLY, STANDARD_ANNUAL, PRO_ANNUAL, FOUNDING_MEMBER } = PRICE_IDS;
  if (priceId === STANDARD_MONTHLY || priceId === PRO_MONTHLY) return "monthly";
  if (priceId === STANDARD_ANNUAL || priceId === PRO_ANNUAL || priceId === FOUNDING_MEMBER) return "annual";
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, is_founding_member")
    .eq("id", user.id)
    .single();

  const empty: SubscriptionState = {
    tier: null,
    cadence: null,
    currentPriceId: null,
    status: null,
    isFoundingMember: profile?.is_founding_member ?? false,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    pendingChange: null,
  };

  if (!profile?.stripe_subscription_id) {
    return res.status(200).json(empty);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    // Cast via unknown: Stripe SDK's Subscription type doesn't surface
    // current_period_end at the top level (it moved under items in newer API
    // versions), but the raw API still returns it and we rely on it here.
    // Leave `schedule` typed natively (string | SubscriptionSchedule | null)
    // so the union works below.
    const subscription = (await stripe.subscriptions.retrieve(profile.stripe_subscription_id)) as unknown as Stripe.Subscription & {
      current_period_end: number | null;
    };

    const currentPriceId = subscription.items?.data?.[0]?.price?.id ?? "";
    const tier = profile.is_founding_member
      ? "founding_member" as const
      : tierFromPriceId(currentPriceId);

    let pendingChange: SubscriptionState["pendingChange"] = null;

    if (subscription.schedule) {
      const scheduleId = typeof subscription.schedule === "string"
        ? subscription.schedule
        : subscription.schedule.id;
      const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
      // Look for a future phase — phase[0] is the current one, phase[1+] is upcoming.
      const nowSec = Math.floor(Date.now() / 1000);
      const futurePhase = schedule.phases.find((p) => p.start_date > nowSec);
      if (futurePhase) {
        const newPriceId = futurePhase.items?.[0]?.price;
        const priceIdStr = typeof newPriceId === "string" ? newPriceId : (newPriceId?.id ?? "");
        const newTier = tierFromPriceId(priceIdStr);
        if (newTier === "standard" || newTier === "pro") {
          pendingChange = {
            scheduleId,
            newPriceId: priceIdStr,
            newTier,
            effectiveAt: new Date(futurePhase.start_date * 1000).toISOString(),
          };
        }
      }
    }

    const state: SubscriptionState = {
      tier,
      cadence: cadenceFromPriceId(currentPriceId),
      currentPriceId,
      status: subscription.status,
      isFoundingMember: profile.is_founding_member,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      pendingChange,
    };

    return res.status(200).json(state);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[subscription-state] failed:", message);
    return res.status(500).json({ error: message });
  }
}
