export const PRICE_IDS = {
  STANDARD_MONTHLY:  "price_1TtndoFjbj4UzaeOQylXtpvy",
  STANDARD_ANNUAL:   "price_1TtnhLFjbj4UzaeOasACnvcY",
  PRO_MONTHLY:       "price_1TtnjFFjbj4UzaeOjYPKMP9R",
  PRO_ANNUAL:        "price_1TtnjfFjbj4UzaeOQVWellKp",
  FOUNDING_MEMBER:   "price_1TtnldFjbj4UzaeOz8P979WZ",
} as const;

export async function createCheckoutSession(
  priceId: string,
  userId: string,
  email: string,
  isFoundingMember = false,
): Promise<void> {
  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId, userId, email, isFoundingMember }),
  });
  const data = await res.json() as { url?: string; error?: string };
  if (data.error) throw new Error(data.error);
  if (data.url) window.location.href = data.url;
}

export async function createPortalSession(token: string): Promise<void> {
  const res = await fetch("/api/create-portal-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json() as { url?: string; error?: string };
  if (data.error) throw new Error(data.error);
  if (data.url) window.location.href = data.url;
}

// ── Subscription management (single consolidated endpoint) ───────────────────
// Backed by api/subscription.ts, which dispatches on method + body.action.
// Consolidated into one function to stay under Vercel's Hobby-tier
// serverless function count limit; the client-side surface is unchanged.

export interface SubscriptionState {
  tier: "standard" | "pro" | "founding_member" | null;
  cadence: "monthly" | "annual" | null;
  currentPriceId: string | null;
  status: string | null;
  isFoundingMember: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pendingChange: {
    scheduleId: string;
    newPriceId: string;
    newTier: "standard" | "pro";
    effectiveAt: string;
  } | null;
}

async function subscriptionApi<T>(token: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/subscription", {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as T & { error?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export function fetchSubscriptionState(token: string): Promise<SubscriptionState> {
  return subscriptionApi<SubscriptionState>(token);
}

export function scheduleSubscriptionChange(
  token: string,
  targetPriceId: string,
): Promise<{ scheduleId: string; effectiveAt: string }> {
  return subscriptionApi(token, { action: "schedule_change", targetPriceId });
}

export function cancelScheduledChange(token: string): Promise<{ released: true }> {
  return subscriptionApi(token, { action: "cancel_scheduled" });
}

export function reactivateSubscription(token: string): Promise<{ reactivated: true; status: string }> {
  return subscriptionApi(token, { action: "reactivate" });
}

export function cancelSubscription(
  token: string,
  reason: string,
  feedbackText?: string,
): Promise<{ cancelled: true; accessUntil: string | null }> {
  return subscriptionApi(token, { action: "cancel", reason, feedback_text: feedbackText });
}
