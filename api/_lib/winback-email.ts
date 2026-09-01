// api/_lib/winback-email.ts
// Sent by the daily "winback" cron job in api/cron.ts, once per user, 3-4
// days after cancellation lands (subscription_status = 'cancelled'). Copy is
// deliberately neutral about whether broker sync was previously active — many
// recipients are lapsed trial users who never had it.

import { Resend } from "resend";
import {
  APP_URL,
  checklistItemHtml,
  formatDayMonth,
  renderLifecycleEmail,
} from "./lifecycle-email-template.js";

export async function sendWinbackEmail({
  to,
  fullName,
  cancelledAt,
}: {
  to: string;
  fullName: string | null;
  cancelledAt: Date | null;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const firstName = fullName?.trim().split(/\s+/)[0] || null;
  const dateLabel = cancelledAt ? formatDayMonth(cancelledAt) : "recently";
  const dateFragment = cancelledAt
    ? `<strong style="color:#0a0a0a;">${dateLabel}</strong>`
    : "recently";

  const introHtml =
    `Your StreamBias access paused on ${dateFragment}. Nothing's lost — it's all saved and ready the moment you reconnect.`;

  const contentHtml = `${checklistItemHtml(
    [
      { title: "Live bias reads",     body: "Ready to give you the real-time read across every timeframe the moment you're back." },
      { title: "Your trading journal", body: "Paused, not lost — your analytics pick up right where you left them." },
      { title: "Broker sync",         body: "Connect MT4/MT5 and let your trades log themselves — no manual entry." },
    ],
    { iconVariant: "pause" },
  )}

        <p style="font-size:13px;color:#4a4a4a;line-height:1.6;margin:24px 0 26px;">Come back anytime — everything you built is exactly where you left it.</p>`;

  await resend.emails.send({
    from: "StreamBias <team@streambias.com>",
    to,
    subject: "Pick up right where you left off",
    html: renderLifecycleEmail({
      eyebrow: "Ready when you are",
      headline: "Here's what's waiting for you",
      greetingHtml: `Hi ${firstName ?? "there"},`,
      introHtml,
      contentHtml,
      ctaLabel: "Reactivate my plan",
      ctaHref: `${APP_URL}/pricing`,
    }),
  });
}
