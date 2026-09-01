// api/_lib/welcome-email.ts
// Sent from api/webhook.ts on checkout.session.completed when the resulting
// subscription is in "trialing" status (Standard or Pro — not Founding Member,
// which has no trial). Introduces the trial and sets expectation that broker
// sync unlocks only after conversion.

import { Resend } from "resend";
import {
  APP_URL,
  checklistItemHtml,
  formatDayMonth,
  renderLifecycleEmail,
} from "./lifecycle-email-template.js";

export async function sendWelcomeEmail({
  to,
  trialEndsAt,
}: {
  to: string;
  trialEndsAt: Date | null;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const dateLabel = trialEndsAt ? formatDayMonth(trialEndsAt) : "the end of your trial";
  const dateFragment = trialEndsAt
    ? `<strong style="color:#0a0a0a;">${dateLabel}</strong>`
    : "the end of your trial";

  const introHtml = `Your 7-day Standard trial is live — no charge until ${dateFragment}. Cancel any time before then from <a href="${APP_URL}/settings" style="color:#0092ce;text-decoration:underline;">Settings</a> if it's not for you.`;

  // "Log trades manually" copy is deliberately explicit that broker sync is
  // post-trial only — matches product decision confirmed by Luke.
  const contentHtml = `        <p style="font-size:13px;color:#0a0a0a;font-weight:500;margin:0 0 12px;">Here's what's unlocked</p>
${checklistItemHtml(
  [
    { title: "Bias engine",         body: "See the live read across every timeframe." },
    { title: "Trading journal",     body: "Log a trade and see the analytics build." },
    { title: "Log trades manually", body: "Track every trade by hand — broker sync unlocks automatically once your trial converts." },
  ],
  { iconVariant: "empty" },
)}
        <div style="height:26px;"></div>`;

  // Resend SDK resolves with { data, error } on API-level failures instead of
  // throwing (e.g. rate limit, unverified recipient, invalid HTML) — check the
  // error field so real failures propagate to the caller's try/catch and
  // welcome_email_sent_at only gets written when the email actually sent.
  const { error } = await resend.emails.send({
    from: "StreamBias <team@streambias.com>",
    to,
    subject: "Your edge starts now",
    html: renderLifecycleEmail({
      eyebrow: "Trial started",
      headline: "Your edge starts now",
      introHtml,
      contentHtml,
      ctaLabel: "Go to dashboard",
      ctaHref: `${APP_URL}/dashboard`,
    }),
  });
  if (error) {
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  }
}
