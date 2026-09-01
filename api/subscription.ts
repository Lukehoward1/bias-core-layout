// api/subscription.ts
// Consolidated subscription-management endpoint. One serverless function
// dispatches on HTTP method + body.action to keep the deployed function
// count under the Vercel Hobby plan's per-deployment limit.
//
//   GET  /api/subscription                                            → SubscriptionState
//   POST /api/subscription  { action: "schedule_change", targetPriceId }
//   POST /api/subscription  { action: "cancel_scheduled" }
//   POST /api/subscription  { action: "reactivate" }
//   POST /api/subscription  { action: "cancel", reason, feedback_text? }
//
// Uses the canonical Stripe Subscription Schedules primitive for plan
// changes (create schedule with two phases: phase 0 mirrors current
// subscription, phase 1 activates the new price at phase 0's end,
// proration_behavior: 'none'). See docs.stripe.com/billing/subscriptions/
// subscription-schedules — "Upgrading or downgrading a subscription" is
// the canonical use case.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { PRICE_IDS } from "../src/lib/stripe.js";
import { requireSubscriber, blockFoundingMember, type CallerProfile } from "./_lib/subscription-auth.js";
import { sendCancellationAlertEmail } from "./_lib/cancellation-alert-email.js";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Price helpers ────────────────────────────────────────────────────────────

const ALLOWED_TARGETS = new Set<string>([
  PRICE_IDS.STANDARD_MONTHLY,
  PRICE_IDS.STANDARD_ANNUAL,
  PRICE_IDS.PRO_MONTHLY,
  PRICE_IDS.PRO_ANNUAL,
]);

function tierFromPriceId(priceId: string): "standard" | "pro" | "founding_member" | null {
  if (priceId === PRICE_IDS.FOUNDING_MEMBER) return "founding_member";
  if (priceId === PRICE_IDS.PRO_MONTHLY || priceId === PRICE_IDS.PRO_ANNUAL) return "pro";
  if (priceId === PRICE_IDS.STANDARD_MONTHLY || priceId === PRICE_IDS.STANDARD_ANNUAL) return "standard";
  return null;
}

function cadenceOf(priceId: string): "monthly" | "annual" | null {
  if (priceId === PRICE_IDS.STANDARD_MONTHLY || priceId === PRICE_IDS.PRO_MONTHLY) return "monthly";
  if (priceId === PRICE_IDS.STANDARD_ANNUAL || priceId === PRICE_IDS.PRO_ANNUAL || priceId === PRICE_IDS.FOUNDING_MEMBER) return "annual";
  return null;
}

// ── Reason validation (cancel) ───────────────────────────────────────────────

const ALLOWED_REASONS = new Set<string>([
  "too_expensive",
  "not_using_enough",
  "missing_feature",
  "switched_competitor",
  "technical_issues",
  "other",
]);

// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requireSubscriber(req, res);
  if (!ctx) return;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    if (req.method === "GET") {
      return await handleGetState(res, ctx, stripe);
    }

    if (req.method === "POST") {
      const action = (req.body as { action?: string })?.action;
      switch (action) {
        case "schedule_change":  return await handleScheduleChange(req, res, ctx, stripe);
        case "cancel_scheduled": return await handleCancelScheduled(res, ctx, stripe);
        case "reactivate":       return await handleReactivate(res, ctx, stripe);
        case "cancel":           return await handleCancel(req, res, ctx, stripe);
        default:                 return res.status(400).json({ error: "Unknown action." });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/subscription]", req.method, (req.body as { action?: string })?.action, "failed:", message);
    return res.status(500).json({ error: message });
  }
}

// ── GET /api/subscription → SubscriptionState ────────────────────────────────

async function handleGetState(res: VercelResponse, ctx: CallerProfile, stripe: Stripe): Promise<VercelResponse> {
  // current_period_end isn't on the SDK's Subscription type in this version
  // but is present in the raw API response — cast via unknown to read it.
  const subscription = (await stripe.subscriptions.retrieve(ctx.stripeSubscriptionId)) as unknown as Stripe.Subscription & {
    current_period_end: number | null;
  };

  const currentPriceId = subscription.items?.data?.[0]?.price?.id ?? "";
  const tier = ctx.isFoundingMember
    ? "founding_member" as const
    : tierFromPriceId(currentPriceId);

  let pendingChange: SubscriptionState["pendingChange"] = null;
  if (subscription.schedule) {
    const scheduleId = typeof subscription.schedule === "string"
      ? subscription.schedule
      : subscription.schedule.id;
    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
    const nowSec = Math.floor(Date.now() / 1000);
    const futurePhase = schedule.phases.find((p) => p.start_date > nowSec);
    if (futurePhase) {
      const rawPrice = futurePhase.items?.[0]?.price;
      const priceIdStr = typeof rawPrice === "string" ? rawPrice : (rawPrice?.id ?? "");
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
    cadence: cadenceOf(currentPriceId),
    currentPriceId,
    status: subscription.status,
    isFoundingMember: ctx.isFoundingMember,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    pendingChange,
  };

  return res.status(200).json(state);
}

// ── POST action=schedule_change → schedule plan switch at period end ─────────

async function handleScheduleChange(req: VercelRequest, res: VercelResponse, ctx: CallerProfile, stripe: Stripe): Promise<VercelResponse> {
  if (blockFoundingMember(res, ctx)) return res;

  const { targetPriceId } = req.body as { targetPriceId?: string };
  if (!targetPriceId || !ALLOWED_TARGETS.has(targetPriceId)) {
    return res.status(400).json({ error: "Invalid target plan." });
  }

  const subscription = await stripe.subscriptions.retrieve(ctx.stripeSubscriptionId);
  const currentPriceId = subscription.items?.data?.[0]?.price?.id ?? "";

  if (currentPriceId === targetPriceId) {
    return res.status(400).json({ error: "You're already on that plan." });
  }
  if (cadenceOf(currentPriceId) !== cadenceOf(targetPriceId)) {
    return res.status(400).json({
      error: "Switching between monthly and annual isn't supported here. Cancel and re-subscribe on the new cadence.",
    });
  }

  // Get or create the schedule attached to this subscription.
  let scheduleId: string;
  if (subscription.schedule) {
    scheduleId = typeof subscription.schedule === "string"
      ? subscription.schedule
      : subscription.schedule.id;
  } else {
    const created = await stripe.subscriptionSchedules.create({
      from_subscription: ctx.stripeSubscriptionId,
    });
    scheduleId = created.id;
  }

  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  const currentPhase = schedule.phases[0];
  if (!currentPhase) {
    return res.status(500).json({ error: "Schedule has no current phase — cannot update." });
  }

  const currentPhaseItems = currentPhase.items.map((item) => ({
    price: typeof item.price === "string" ? item.price : item.price.id,
    quantity: item.quantity ?? 1,
  }));

  const newPhaseInterval: "month" | "year" = cadenceOf(targetPriceId) === "annual" ? "year" : "month";

  // Phase 1's duration is one billing cycle at the new cadence. Combined
  // with end_behavior: 'release', the schedule detaches after that cycle
  // and the subscription continues on the new price naturally.
  await stripe.subscriptionSchedules.update(scheduleId, {
    phases: [
      {
        items: currentPhaseItems,
        start_date: currentPhase.start_date,
        end_date: currentPhase.end_date,
        proration_behavior: "none",
      },
      {
        items: [{ price: targetPriceId, quantity: 1 }],
        duration: { interval: newPhaseInterval, interval_count: 1 },
        proration_behavior: "none",
      },
    ],
    end_behavior: "release",
  });

  return res.status(200).json({
    scheduleId,
    effectiveAt: new Date((currentPhase.end_date ?? 0) * 1000).toISOString(),
  });
}

// ── POST action=cancel_scheduled → release pending schedule ──────────────────

async function handleCancelScheduled(res: VercelResponse, ctx: CallerProfile, stripe: Stripe): Promise<VercelResponse> {
  const subscription = await stripe.subscriptions.retrieve(ctx.stripeSubscriptionId);
  if (!subscription.schedule) {
    return res.status(400).json({ error: "No scheduled change to cancel." });
  }

  const scheduleId = typeof subscription.schedule === "string"
    ? subscription.schedule
    : subscription.schedule.id;
  await stripe.subscriptionSchedules.release(scheduleId);
  return res.status(200).json({ released: true });
}

// ── POST action=reactivate → undo cancel_at_period_end ───────────────────────

async function handleReactivate(res: VercelResponse, ctx: CallerProfile, stripe: Stripe): Promise<VercelResponse> {
  const subscription = await stripe.subscriptions.retrieve(ctx.stripeSubscriptionId);
  if (!subscription.cancel_at_period_end) {
    return res.status(400).json({ error: "Subscription isn't scheduled for cancellation." });
  }
  const updated = await stripe.subscriptions.update(ctx.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
  return res.status(200).json({ reactivated: true, status: updated.status });
}

// ── POST action=cancel → cancel_at_period_end + record feedback ──────────────

async function handleCancel(req: VercelRequest, res: VercelResponse, ctx: CallerProfile, stripe: Stripe): Promise<VercelResponse> {
  const body = req.body as { reason?: string; feedback_text?: string };
  const reason = body.reason?.trim() ?? "";
  const feedbackText = body.feedback_text?.trim() || null;

  if (!ALLOWED_REASONS.has(reason)) {
    return res.status(400).json({ error: "A valid cancellation reason is required." });
  }

  // Release any pending schedule first so a queued Standard↔Pro switch
  // doesn't fire post-cancel.
  const subscription = await stripe.subscriptions.retrieve(ctx.stripeSubscriptionId);
  if (subscription.schedule) {
    const scheduleId = typeof subscription.schedule === "string"
      ? subscription.schedule
      : subscription.schedule.id;
    try {
      await stripe.subscriptionSchedules.release(scheduleId);
    } catch (err) {
      // Best-effort — if release fails we still want the cancel to go through.
      console.warn("[api/subscription cancel] release of pending schedule failed:", err instanceof Error ? err.message : err);
    }
  }

  const updated = (await stripe.subscriptions.update(ctx.stripeSubscriptionId, {
    cancel_at_period_end: true,
  })) as unknown as Stripe.Subscription & { current_period_end: number | null };

  const currentPriceId = updated.items?.data?.[0]?.price?.id ?? "";
  let cadence: "monthly" | "annual" | null = null;
  if (currentPriceId) {
    try {
      const price = await stripe.prices.retrieve(currentPriceId);
      cadence = price.recurring?.interval === "year" ? "annual" : "monthly";
    } catch {
      // best-effort — cadence stays null
    }
  }

  const { error: insertErr } = await ctx.supabase.from("cancellation_feedback").insert({
    user_id: ctx.userId,
    tier_at_cancellation: ctx.subscriptionTier ?? "unknown",
    cadence_at_cancellation: cadence,
    reason,
    feedback_text: feedbackText,
  });

  if (insertErr) {
    // Log but don't fail — the cancel already succeeded.
    console.error("[api/subscription cancel] feedback insert failed:", insertErr.message);
  }

  // Awaited inline admin alert (NOT fire-and-forget) — same freeze-after-
  // response risk we hit with the welcome email in webhook.ts. Own try/catch
  // so a Resend failure never fails the user's actual cancellation, which
  // must always return 200 regardless of whether the internal alert lands.
  try {
    const { data } = await ctx.supabase.auth.admin.getUserById(ctx.userId);
    await sendCancellationAlertEmail({
      userEmail: data?.user?.email ?? null,
      tier: ctx.subscriptionTier ?? "unknown",
      cadence,
      reason,
      feedbackText,
    });
  } catch (err) {
    console.error(
      "[api/subscription cancel] failed to send admin alert:",
      err instanceof Error ? err.message : err,
    );
  }

  return res.status(200).json({
    cancelled: true,
    accessUntil: updated.current_period_end
      ? new Date(updated.current_period_end * 1000).toISOString()
      : null,
  });
}
