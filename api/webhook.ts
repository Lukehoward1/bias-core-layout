import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { PRICE_IDS } from "../src/lib/stripe.js";
import { undeployExcessBrokerConnections } from "./_lib/undeploy.js";
import { sendDowngradeGraceEmail } from "./_lib/downgrade-email.js";
import { sendWelcomeEmail } from "./_lib/welcome-email.js";
import { maxLinkedAccountsForTier } from "./_lib/tier-limits.js";

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
  if (priceId === PRICE_IDS.FOUNDING_MEMBER) return "founding_member";
  if (priceId === PRICE_IDS.PRO_MONTHLY || priceId === PRICE_IDS.PRO_ANNUAL) return "pro";
  return "standard";
}

// Pull the bare address out of "Display Name <foo@bar.com>" or "foo@bar.com".
function extractEmailAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

// Minimal HTML → plain-text fallback for when the inbound message has no
// text/plain part. Not a general-purpose stripper — just good enough to keep
// the forwarded email readable.
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const rawBody = await getRawBody(req);

  // ── Branch: Resend inbound webhook (Svix-signed) ─────────────────────────
  // This endpoint is shared with Stripe because we're at Vercel Hobby's
  // 12-function ceiling. Resend's inbound webhooks are Svix-signed and carry
  // svix-id / svix-timestamp / svix-signature headers; Stripe uses
  // stripe-signature. Presence of svix-id is our branch discriminator —
  // check it BEFORE the Stripe path so Resend POSTs don't get fed into
  // stripe.webhooks.constructEvent and rejected.
  if (req.headers["svix-id"]) {
    return handleResendInbound(req, res, supabase, rawBody);
  }

  // ── Existing Stripe path (unchanged) ─────────────────────────────────────
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
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
        if (!userId || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as Stripe.Subscription & { current_period_end: number | null };
        const isFoundingMember = session.metadata?.isFoundingMember === "true";
        const priceId = subscription.items?.data?.[0]?.price?.id ?? "";
        const tier = isFoundingMember ? "founding_member" : tierFromPriceId(priceId);

        const { error: upsertError } = await supabase.from("profiles").upsert({
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
        if (upsertError) console.error("Profile upsert error:", JSON.stringify(upsertError));

        // Welcome email — trials only (Standard/Pro), excludes Founding Member
        // (no trial). Awaited inline (NOT fire-and-forget) because Vercel
        // freezes the function context after res.status(200), and the previous
        // IIFE version silently orphaned the pending Resend fetch mid-flight —
        // welcome_email_sent_at stayed null and no email landed.
        //
        // Wrapped in its own try/catch so a Resend failure doesn't propagate
        // to the outer 500 handler — that would make Stripe retry the whole
        // webhook and duplicate the profile upsert.
        if (subscription.status === "trialing" && session.customer_email) {
          try {
            await sendWelcomeEmail({
              to: session.customer_email,
              trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            });
            await supabase
              .from("profiles")
              .update({ welcome_email_sent_at: new Date().toISOString() })
              .eq("id", userId);
          } catch (err) {
            console.error(
              "[webhook] welcome email send failed:",
              err instanceof Error ? err.message : err,
            );
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end: number | null };
        const { data: rows } = await supabase
          .from("profiles")
          .select("id, email, is_founding_member")
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

        // Enforce account limits on active/trialing status changes only.
        // past_due/unpaid: skip — Stripe's dunning handles those.
        // deleted: handled by customer.subscription.deleted below.
        if (subscription.status === "active" || subscription.status === "trialing") {
          const newMax = maxLinkedAccountsForTier(tier, subscription.status);

          const { count: currentCount } = await supabase
            .from("linked_accounts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", row.id);

          const count = currentCount ?? 0;

          if (newMax >= count) {
            // Re-upgrade or count already within limit — clear any stale grace period
            await supabase.from("profiles").update({
              downgrade_grace_end_at: null,
              downgrade_new_max: null,
              downgrade_account_chosen: null,
            }).eq("id", row.id);
          } else {
            // Downgrade: write 72-hour grace period instead of immediate undeploy
            const graceEndAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
            await supabase.from("profiles").update({
              downgrade_grace_end_at: graceEndAt.toISOString(),
              downgrade_new_max: newMax,
              downgrade_account_chosen: null,
            }).eq("id", row.id);

            // Awaited inline (NOT fire-and-forget) — same freeze-after-response
            // risk we hit with the welcome email. Own try/catch so a Resend
            // failure doesn't propagate to the outer 500 handler → Stripe
            // webhook retry → duplicate downgrade-grace-period writes.
            if (row.email) {
              try {
                await sendDowngradeGraceEmail({
                  to: row.email,
                  graceEndAt,
                  accountCount: count,
                  newMax,
                });
              } catch (err) {
                console.error(
                  "[webhook] failed to send downgrade grace email:",
                  err instanceof Error ? err.message : err,
                );
              }
            }

            console.log(`[webhook] downgrade grace period written for user ${row.id} (max=${newMax}, expires=${graceEndAt.toISOString()})`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: profile, error: profileLookupError } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .limit(1)
          .single();

        if (profileLookupError) {
          console.error("[webhook] failed to look up profile for subscription", subscription.id, profileLookupError.message);
        }

        await supabase.from("profiles").update({
          subscription_status: "cancelled",
          cancelled_at: new Date().toISOString(),
          // Clear any pending grace period — subscription is gone, undeploy immediately
          downgrade_grace_end_at: null,
          downgrade_new_max: null,
          downgrade_account_chosen: null,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscription.id);

        if (profile?.id) {
          await undeployExcessBrokerConnections(supabase, profile.id, 0);
        }
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

// ── Resend inbound handler ──────────────────────────────────────────────────
// Verifies the Svix signature, fetches the full inbound email, looks up the
// sender in `profiles` for a priority tag, and forwards to FORWARD_TO with
// the sender in Reply-To so a reply goes straight back to the customer.
//
// Return contract:
//   400 → invalid signature (Resend won't retry a bad signature)
//   200 → everything else (verified events, even unrecognized types or a
//         failed forward — logged but not retried; Resend's exponential
//         backoff isn't useful for forward-delivery issues on our side)

async function handleResendInbound(
  req: VercelRequest,
  res: VercelResponse,
  // The supabase client type comes from createClient(url, key) called without
  // a Database generic — its inferred shape doesn't line up cleanly with
  // ReturnType<typeof createClient> (the createClient overload defaults
  // resolve differently in the two positions). `any` here matches how the
  // existing Stripe-side profile queries in this file treat it — no runtime
  // effect.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rawBody: Buffer,
): Promise<VercelResponse> {
  // Hardcoded destination — intentionally swappable later when someone else
  // takes over inbound customer email. Keeping it as a local const makes the
  // swap obvious in one place.
  const FORWARD_TO = "luke@hfx-capital.com";

  const resend = new Resend(process.env.RESEND_API_KEY!);

  // The SDK's verify() signature: { payload, webhookSecret, headers: { id,
  // timestamp, signature } } — the SDK internally maps to webhook-* header
  // names for the underlying svix library. Throws on invalid signature; catch
  // and 400 (400 = don't retry a bad signature; 500 would trigger Resend's
  // exponential backoff).
  let event: { type: string; data: { email_id: string } };
  try {
    event = resend.webhooks.verify({
      payload: rawBody.toString("utf8"),
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET!,
      headers: {
        id: req.headers["svix-id"] as string,
        timestamp: req.headers["svix-timestamp"] as string,
        signature: req.headers["svix-signature"] as string,
      },
    }) as { type: string; data: { email_id: string } };
  } catch (err) {
    console.error(
      "[webhook/resend] signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return res.status(400).json({ error: "Invalid Resend signature" });
  }

  if (event.type !== "email.received") {
    console.log("[webhook/resend] ignoring event type:", event.type);
    return res.status(200).json({ received: true });
  }

  // Fetch full message content (event payload is metadata-only).
  const { data: email, error: fetchErr } = await resend.emails.receiving.get(event.data.email_id);
  if (fetchErr || !email) {
    console.error("[webhook/resend] failed to fetch inbound email:", JSON.stringify(fetchErr));
    return res.status(200).json({ received: true });
  }

  const senderEmail = extractEmailAddress(email.from ?? "");
  if (!senderEmail) {
    console.error("[webhook/resend] could not extract sender address from:", email.from);
    return res.status(200).json({ received: true });
  }

  // Priority tag lookup — best-effort. If the profile query fails or the
  // sender isn't in profiles, we still forward without a tag.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_founding_member, subscription_tier, subscription_status")
    .eq("email", senderEmail)
    .maybeSingle();

  let tag: string | null = null;
  if (profile?.is_founding_member) {
    tag = "[FOUNDING MEMBER — PRIORITY]";
  } else if (
    profile?.subscription_tier === "pro" &&
    (profile?.subscription_status === "active" || profile?.subscription_status === "trialing")
  ) {
    tag = "[PRO — PRIORITY]";
  }

  const originalSubject = email.subject || "(no subject)";
  const bodyText = email.text ?? (email.html ? stripHtml(email.html) : "(no readable body)");

  const { error: sendErr } = await resend.emails.send({
    from: "BIAS Inbound <alerts@streambias.com>",
    to: FORWARD_TO,
    replyTo: senderEmail,
    subject: `${tag ? tag + " " : ""}Reply: ${originalSubject}`,
    text: `From: ${email.from}\n\n${bodyText}`,
  });

  if (sendErr) {
    // Log but still 200 — Resend retrying won't fix a downstream send failure
    // on our side, and we don't want the inbound to endlessly reprocess.
    console.error(
      "[webhook/resend] failed to forward inbound email:",
      typeof sendErr === "object" ? JSON.stringify(sendErr) : sendErr,
    );
  }

  return res.status(200).json({ received: true });
}
