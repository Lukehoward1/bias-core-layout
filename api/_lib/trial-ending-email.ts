// api/_lib/trial-ending-email.ts
// Sent by the daily "trial-ending-reminder" cron job in api/cron.ts, once per
// user, ~24 hours before the trial converts to paid. Frames post-conversion
// unlock of broker sync as the specific value beat.

import { Resend } from "resend";
import {
  APP_URL,
  formatDayMonth,
  renderLifecycleEmail,
} from "./lifecycle-email-template.js";

export async function sendTrialEndingEmail({
  to,
  fullName,
  trialEndsAt,
  amountLabel,
}: {
  to: string;
  fullName: string | null;
  trialEndsAt: Date | null;
  amountLabel: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const firstName = fullName?.trim().split(/\s+/)[0] || null;
  const dateLabel = trialEndsAt ? formatDayMonth(trialEndsAt) : "your trial end date";
  const dateFragment = trialEndsAt
    ? `<strong style="color:#0a0a0a;">${dateLabel}</strong>`
    : "your trial end date";
  const amountFragment = `<strong style="color:#0a0a0a;">${amountLabel}</strong>`;

  const introHtml =
    `Your trial has been manual entry only — that's by design, so you could get a feel for the bias engine and journal first. From tomorrow, when your Standard plan activates, you get the full thing.`;

  // Spotlight card highlighting the single post-trial value beat (broker sync),
  // plus the small "nothing to do + change if you want" reassurance lines.
  const contentHtml = `        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f5f9fc,#eaf5fb);border:1px solid #e3f2fa;border-radius:10px;margin:0 0 22px;">
          <tr>
            <td style="padding:18px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:14px;vertical-align:top;">
                    <div style="width:40px;height:40px;border-radius:9px;background:#0092ce;display:flex;align-items:center;justify-content:center;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    </div>
                  </td>
                  <td style="vertical-align:top;">
                    <p style="font-size:15px;font-weight:600;color:#0a0a0a;margin:0 0 4px;">Broker sync unlocks</p>
                    <p style="font-size:13px;color:#4a4a4a;margin:0;line-height:1.6;">Connect MT4/MT5 and every trade logs itself — no more manual entry.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="font-size:13px;color:#7a7a7a;line-height:1.6;margin:0 0 4px;">Nothing to do — access continues automatically on ${dateFragment} at ${amountFragment}.</p>
        <p style="font-size:13px;color:#7a7a7a;line-height:1.6;margin:0 0 26px;">Want to make changes first? <a href="${APP_URL}/settings" style="color:#0092ce;text-decoration:underline;">Manage your subscription</a>.</p>`;

  // Resend SDK resolves with { data, error } on API-level failures instead of
  // throwing — check the error field so real failures propagate to the
  // caller's try/catch and trial_reminder_sent_at only gets written when the
  // email actually sent.
  const { error } = await resend.emails.send({
    from: "StreamBias <team@streambias.com>",
    to,
    subject: "No more manual entry, starting tomorrow",
    html: renderLifecycleEmail({
      eyebrow: "Unlocking tomorrow",
      headline: "The full platform unlocks tomorrow",
      greetingHtml: `Hi ${firstName ?? "there"},`,
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
