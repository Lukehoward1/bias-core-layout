// api/reactivate-subscription.ts
// Undoes a cancel_at_period_end — subscription continues past its would-be
// cancellation date. Used when a user changes their mind after cancelling
// but before the period actually ends.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { requireSubscriber } from "./_lib/subscription-auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await requireSubscriber(req, res);
  if (!ctx) return;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const subscription = await stripe.subscriptions.retrieve(ctx.stripeSubscriptionId);

    if (!subscription.cancel_at_period_end) {
      return res.status(400).json({ error: "Subscription isn't scheduled for cancellation." });
    }

    const updated = await stripe.subscriptions.update(ctx.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return res.status(200).json({ reactivated: true, status: updated.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[reactivate-subscription] failed:", message);
    return res.status(500).json({ error: message });
  }
}
