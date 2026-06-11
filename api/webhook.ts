// ── IMPORTANT: Add STRIPE_WEBHOOK_SECRET to Vercel env vars after setting up webhook in Stripe dashboard ──
// ── Also add APP_URL=https://bias-core-layout.vercel.app to Vercel env vars ──

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function tierFromPriceId(priceId: string): string {
  if (priceId === "price_1TglprCKkT3ytOGoCBfIoJCG") return "founding_member";
  if (["price_1TgllWCKkT3ytOGov6NHnnGz", "price_1Tglm3CKkT3ytOGoHBg4g07x"].includes(priceId)) return "pro";
  return "standard";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log("WEBHOOK_SECRET present:", !!process.env.STRIPE_WEBHOOK_SECRET);
  console.log("SUPABASE_URL present:", !!process.env.SUPABASE_URL);
  console.log("SERVICE_ROLE present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    console.log("Webhook received:", event.type);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature error:", message);
    return res.status(400).json({ error: `Webhook Error: ${message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        console.log("Processing checkout for userId:", userId);
        if (!userId || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const isFoundingMember = session.metadata?.isFoundingMember === "true";
        const priceId = subscription.items?.data?.[0]?.price?.id ?? "";
        const tier = isFoundingMember ? "founding_member" : tierFromPriceId(priceId);

        const { error: upsertError, data: upsertData } = await supabase.from("profiles").upsert({
          id: userId,
          email: session.customer_email ?? "",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_tier: tier,
          is_founding_member: isFoundingMember,
          trial_ends_at: subscription.trial_end && typeof subscription.trial_end === "number"
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          current_period_end: subscription.current_period_end && typeof subscription.current_period_end === "number"
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        console.log("Profile upsert attempted for userId:", userId);
        console.log("Upsert error:", JSON.stringify(upsertError));
        console.log("Upsert data:", JSON.stringify(upsertData));
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: rows } = await supabase
          .from("profiles")
          .select("id, is_founding_member")
          .eq("stripe_subscription_id", subscription.id)
          .limit(1);

        if (!rows?.length) break;
        const row = rows[0];
        const priceId = subscription.items?.data?.[0]?.price?.id ?? "";
        const tier = row.is_founding_member ? "founding_member" : tierFromPriceId(priceId);

        await supabase.from("profiles").update({
          subscription_status: subscription.status,
          subscription_tier: tier,
          trial_ends_at: subscription.trial_end && typeof subscription.trial_end === "number"
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          current_period_end: subscription.current_period_end && typeof subscription.current_period_end === "number"
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase.from("profiles").update({
          subscription_status: "cancelled",
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscription.id);
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook processing error:", message);
    return res.status(500).json({ error: message });
  }
}
