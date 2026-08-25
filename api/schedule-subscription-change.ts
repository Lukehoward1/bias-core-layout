// api/schedule-subscription-change.ts
// Schedules a plan switch (Standard ↔ Pro) that takes effect at the end of the
// current billing period. No proration, no immediate charge/credit.
//
// Uses Stripe Subscription Schedules (the canonical primitive for this per
// docs.stripe.com/billing/subscriptions/subscription-schedules):
//   1. If no schedule attached: create one from the existing subscription.
//   2. Update the schedule's phases: phase 0 = current (unchanged), phase 1 =
//      target price starting when phase 0 ends, proration_behavior: 'none'.
//
// If the user already has a pending scheduled change, this replaces it — so
// clicking Upgrade twice doesn't stack schedules.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { PRICE_IDS } from "../src/lib/stripe.js";
import { requireSubscriber, blockFoundingMember } from "./_lib/subscription-auth.js";

const ALLOWED_TARGETS = new Set<string>([
  PRICE_IDS.STANDARD_MONTHLY,
  PRICE_IDS.STANDARD_ANNUAL,
  PRICE_IDS.PRO_MONTHLY,
  PRICE_IDS.PRO_ANNUAL,
]);

function cadenceOf(priceId: string): "monthly" | "annual" | null {
  if (priceId === PRICE_IDS.STANDARD_MONTHLY || priceId === PRICE_IDS.PRO_MONTHLY) return "monthly";
  if (priceId === PRICE_IDS.STANDARD_ANNUAL || priceId === PRICE_IDS.PRO_ANNUAL) return "annual";
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await requireSubscriber(req, res);
  if (!ctx) return;
  if (blockFoundingMember(res, ctx)) return;

  const { targetPriceId } = req.body as { targetPriceId?: string };
  if (!targetPriceId || !ALLOWED_TARGETS.has(targetPriceId)) {
    return res.status(400).json({ error: "Invalid target plan." });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
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

    // Phase 0 mirrors current sub — keep its item/dates unchanged.
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[schedule-subscription-change] failed:", message);
    return res.status(500).json({ error: message });
  }
}

// Nice-to-know: `iterations: 1` on the new phase means "one billing cycle at
// the interval defined by the price." Combined with end_behavior: 'release',
// after that one cycle the schedule detaches and the subscription continues
// on the new price naturally.
