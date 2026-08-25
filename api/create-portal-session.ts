// api/create-portal-session.ts
// Opens a Stripe Customer Portal session for the authenticated caller.
// Customer ID is derived from the caller's own profile (via requireSubscriber)
// rather than trusted from the client body — matches the auth pattern used
// by all the other subscription-management endpoints.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { requireSubscriber } from "./_lib/subscription-auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ctx = await requireSubscriber(req, res);
  if (!ctx) return;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.stripeCustomerId,
      return_url: "https://streambias.com/settings",
    });
    return res.status(200).json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
