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
//   POST /api/subscription  { action: "support", topic, message, page? }
//
// Uses the canonical Stripe Subscription Schedules primitive for plan
// changes (create schedule with two phases: phase 0 mirrors current
// subscription, phase 1 activates the new price at phase 0's end,
// proration_behavior: 'none'). See docs.stripe.com/billing/subscriptions/
// subscription-schedules — "Upgrading or downgrading a subscription" is
// the canonical use case.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { PRICE_IDS } from "../src/lib/stripe.js";
import { requireSubscriber, blockFoundingMember, type CallerProfile } from "./_lib/subscription-auth.js";
import { sendCancellationAlertEmail } from "./_lib/cancellation-alert-email.js";
import { renderLifecycleEmail, escapeHtml, APP_URL } from "./_lib/lifecycle-email-template.js";

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

// ── Support submission helpers (defined above handler to satisfy no-use-before-define) ──

const SUPPORT_TOPICS = new Set(["billing", "bug", "data", "question", "other"]);
const SUPPORT_TOPIC_LABELS: Record<string, string> = {
  billing:  "Billing",
  bug:      "Bug",
  data:     "Data / prices",
  question: "Question",
  other:    "Other",
};

function escapeHtmlSupport(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function handleSupport(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body as { topic?: string; message?: string; page?: string };
  const topic   = body.topic?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const page    = typeof body.page === "string" ? body.page.trim().slice(0, 200) : null;

  if (!SUPPORT_TOPICS.has(topic)) {
    return res.status(400).json({ error: "Please select a valid topic." });
  }
  if (message.length < 10 || message.length > 2000) {
    return res.status(400).json({ error: "Message must be 10–2000 characters." });
  }

  // Derive priority for email subject (trigger is authoritative for the DB row).
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status, is_founding_member")
    .eq("id", user.id)
    .maybeSingle();

  const isPriority =
    (profile?.is_founding_member === true || profile?.subscription_tier === "pro") &&
    (profile?.subscription_status === "active" || profile?.subscription_status === "trialing");

  const priorityTag  = isPriority ? "PRO" : "STANDARD";
  const topicLabel   = SUPPORT_TOPIC_LABELS[topic] ?? topic;
  const userEmail    = user.email ?? "";
  const planLabel    = profile?.subscription_tier ?? "unknown";
  const pageDisplay  = page ?? "(not provided)";
  const timestamp    = new Date().toUTCString();

  // Insert — trigger enriches email/plan/priority and enforces rate limit.
  const { error: insertErr } = await supabase
    .from("support_requests")
    .insert({ user_id: user.id, topic, message, page });

  if (insertErr) {
    if (insertErr.message === "rate_limit_exceeded") {
      return res.status(429).json({ error: "rate_limit_exceeded" });
    }
    console.error("[api/subscription support] insert failed:", insertErr.message);
    return res.status(500).json({ error: "Failed to submit request. Please try again." });
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Admin notification — best-effort.
  try {
    await resend.emails.send({
      from: "BIAS Alerts <alerts@streambias.com>",
      // Sent straight to the founder's inbox (same as the cancellation alert),
      // so it does not depend on the support@ mailbox/inbound forwarding.
      to: "luke@hfx-capital.com",
      replyTo: userEmail,
      subject: `[${priorityTag}] ${topicLabel} – ${userEmail}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5">
  <div style="max-width:560px;margin:40px auto;padding:0 16px">
    <div style="background:#141414;border:1px solid #262626;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 4px;font-size:18px;font-weight:600;color:#fafafa">Support request</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#525252">${escapeHtmlSupport(timestamp)}</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        <tbody>
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#737373;width:100px">From</td>
            <td style="padding:6px 0;font-size:13px;color:#fafafa">${escapeHtmlSupport(userEmail)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#737373">Topic</td>
            <td style="padding:6px 0;font-size:13px;color:#e5e5e5">${escapeHtmlSupport(topicLabel)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#737373">Plan</td>
            <td style="padding:6px 0;font-size:13px;color:#e5e5e5">${escapeHtmlSupport(planLabel)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#737373">Priority</td>
            <td style="padding:6px 0;font-size:13px;color:#e5e5e5">${escapeHtmlSupport(priorityTag)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#737373">Page</td>
            <td style="padding:6px 0;font-size:13px;color:#e5e5e5">${escapeHtmlSupport(pageDisplay)}</td>
          </tr>
        </tbody>
      </table>
      <h2 style="margin:0 0 8px;font-size:12px;font-weight:600;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.05em">Message</h2>
      <div style="padding:12px 16px;background:#0f0f0f;border:1px solid #262626;border-radius:6px;font-size:13px;color:#e5e5e5;line-height:1.6;white-space:pre-wrap">${escapeHtmlSupport(message)}</div>
    </div>
  </div>
</body>
</html>`.trim(),
    });
  } catch (err) {
    console.error(
      "[api/subscription support] admin email failed:",
      err instanceof Error ? err.message : err,
    );
  }

  // User confirmation — best-effort.
  if (userEmail) {
    try {
      const msgPreview = message.length > 300 ? message.slice(0, 300) + "…" : message;
      const priorityLine = isPriority
        ? `<p style="font-size:13px;color:#9a9a9a;margin:0 0 20px;">Pro and Founding Member requests are prioritised.</p>`
        : `<div style="height:20px;"></div>`;
      const contentHtml = `        <div style="margin:0 0 16px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
          <p style="font-size:12px;color:#9a9a9a;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 8px;">Your message</p>
          <p style="font-size:13px;color:#0a0a0a;margin:0 0 10px;font-weight:500;">${escapeHtml(topicLabel)}</p>
          <p style="font-size:13px;color:#4a4a4a;margin:0;white-space:pre-wrap;line-height:1.6;">${escapeHtml(msgPreview)}</p>
        </div>
${priorityLine}`;

      await resend.emails.send({
        from: "StreamBias <team@streambias.com>",
        to: userEmail,
        replyTo: "support@streambias.com",
        subject: "We received your support request",
        html: renderLifecycleEmail({
          eyebrow: "Support",
          headline: "We've got your message",
          greetingHtml: "Hi,",
          introHtml: `Thanks for getting in touch. We've received your ${escapeHtml(topicLabel.toLowerCase())} request and will reply to this email address.`,
          contentHtml,
          ctaLabel: "Back to StreamBias",
          ctaHref: APP_URL,
        }),
        text: [
          "Hi,",
          "",
          `Thanks for getting in touch. We've received your ${topicLabel.toLowerCase()} request and will reply to this email address.`,
          "",
          `Topic: ${topicLabel}`,
          `Message: ${msgPreview}`,
          "",
          ...(isPriority ? ["Pro and Founding Member requests are prioritised.", ""] : []),
          `Back to StreamBias: ${APP_URL}`,
          "",
          "You can also reach us at support@streambias.com.",
        ].join("\n"),
      });
    } catch (err) {
      console.error(
        "[api/subscription support] user confirmation failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return res.status(200).json({ ok: true });
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Support submission: JWT-only auth — no Stripe subscription required.
  if (req.method === "POST" && (req.body as { action?: string })?.action === "support") {
    return handleSupport(req, res);
  }

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
