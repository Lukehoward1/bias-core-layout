// api/cancel-scheduled-change.ts
// Releases a pending subscription schedule — subscription continues on its
// current plan, the scheduled Standard↔Pro switch is discarded.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { requireSubscriber } from "./_lib/subscription-auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ctx = await requireSubscriber(req, res);
  if (!ctx) return;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const subscription = await stripe.subscriptions.retrieve(ctx.stripeSubscriptionId) as Stripe.Subscription & {
      schedule: string | null;
    };

    if (!subscription.schedule) {
      return res.status(400).json({ error: "No scheduled change to cancel." });
    }

    const scheduleId = typeof subscription.schedule === "string"
      ? subscription.schedule
      : subscription.schedule.id;

    await stripe.subscriptionSchedules.release(scheduleId);

    return res.status(200).json({ released: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cancel-scheduled-change] failed:", message);
    return res.status(500).json({ error: message });
  }
}
