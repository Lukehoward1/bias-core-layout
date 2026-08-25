// api/_lib/subscription-auth.ts
// Shared auth + profile lookup for subscription management endpoints.
// Never trusts client-supplied customerId/subscriptionId — always derives
// them from the caller's own profile row after JWT verification.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface CallerProfile {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionTier: string | null;
  isFoundingMember: boolean;
  supabase: SupabaseClient;
}

/**
 * Verifies the Authorization: Bearer JWT and loads the caller's profile.
 * Returns null after writing an error response — callers should `if (!ctx) return;`.
 * Requires the profile to have both stripe_customer_id and stripe_subscription_id.
 */
export async function requireSubscriber(
  req: VercelRequest,
  res: VercelResponse,
): Promise<CallerProfile | null> {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, subscription_tier, is_founding_member")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile?.stripe_customer_id || !profile?.stripe_subscription_id) {
    res.status(400).json({ error: "No active subscription found." });
    return null;
  }

  return {
    userId: user.id,
    stripeCustomerId: profile.stripe_customer_id,
    stripeSubscriptionId: profile.stripe_subscription_id,
    subscriptionTier: profile.subscription_tier,
    isFoundingMember: Boolean(profile.is_founding_member),
    supabase,
  };
}

/** Guard: block Founding Members from plan-change endpoints. */
export function blockFoundingMember(res: VercelResponse, ctx: CallerProfile): boolean {
  if (ctx.isFoundingMember) {
    res.status(403).json({ error: "Founding Member plans cannot be changed. Contact support." });
    return true;
  }
  return false;
}
