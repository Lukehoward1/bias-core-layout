// api/cancel-subscription.ts
// Sets cancel_at_period_end on the subscription so the user keeps access
// through the period they've already paid for. Also captures the
// reason + optional free-text feedback into the cancellation_feedback table
// for churn analysis.
//
// Edge case: if the user has a pending scheduled plan-change (Standard↔Pro),
// we release the schedule first so the pending change doesn't fire after
// cancellation is confirmed.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { requireSubscriber } from "./_lib/subscription-auth.js";

const ALLOWED_REASONS = new Set<string>([
  "too_expensive",
  "not_using_enough",
  "missing_feature",
  "switched_competitor",
  "technical_issues",
  "other",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await requireSubscriber(req, res);
  if (!ctx) return;

  const body = req.body as { reason?: string; feedback_text?: string };
  const reason = body.reason?.trim() ?? "";
  const feedbackText = body.feedback_text?.trim() || null;

  if (!ALLOWED_REASONS.has(reason)) {
    return res.status(400).json({ error: "A valid cancellation reason is required." });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
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
        console.warn(
          "[cancel-subscription] release of pending schedule failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    // current_period_end isn't surfaced on the SDK's Subscription type in
    // this version but is present in the raw API response — cast to read it.
    const updated = (await stripe.subscriptions.update(ctx.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })) as unknown as Stripe.Subscription & { current_period_end: number | null };

    // Record feedback via service-role client. tier_at_cancellation comes from
    // the profile (already known), cadence is derived from the current price.
    const currentPriceId = updated.items?.data?.[0]?.price?.id ?? "";
    const cadence = currentPriceId.length > 0
      ? await (async () => {
          try {
            const price = await stripe.prices.retrieve(currentPriceId);
            return price.recurring?.interval === "year" ? "annual" : "monthly";
          } catch {
            return null;
          }
        })()
      : null;

    const { error: insertErr } = await ctx.supabase.from("cancellation_feedback").insert({
      user_id: ctx.userId,
      tier_at_cancellation: ctx.subscriptionTier ?? "unknown",
      cadence_at_cancellation: cadence,
      reason,
      feedback_text: feedbackText,
    });

    if (insertErr) {
      // Log but don't fail the request — the cancel already succeeded and
      // failing here would confuse the user. Feedback loss is regrettable
      // but not user-visible.
      console.error("[cancel-subscription] feedback insert failed:", insertErr.message);
    }

    return res.status(200).json({
      cancelled: true,
      accessUntil: updated.current_period_end
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cancel-subscription] failed:", message);
    return res.status(500).json({ error: message });
  }
}
