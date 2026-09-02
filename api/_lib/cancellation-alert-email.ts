// api/_lib/cancellation-alert-email.ts
// Real-time admin alert fired the moment a user confirms cancellation.
// Modeled on downgrade-email.ts (same Resend client + dark HTML template).
// Consumed by api/subscription.ts:handleCancel as a fire-and-forget call.

import { Resend } from "resend";

const REASON_LABELS: Record<string, string> = {
  too_expensive:       "Too expensive",
  not_using_enough:    "Not using it enough",
  missing_feature:     "Missing a feature I need",
  switched_competitor: "Switched to a competitor",
  technical_issues:    "Technical issues",
  other:               "Other",
};

export async function sendCancellationAlertEmail({
  userEmail,
  tier,
  cadence,
  reason,
  feedbackText,
}: {
  userEmail: string | null;
  tier: string;
  cadence: string | null;
  reason: string;
  feedbackText: string | null;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const reasonLabel = REASON_LABELS[reason] ?? reason;
  const cadenceLabel = cadence ?? "—";
  const timestamp = new Date().toUTCString();
  const feedbackBlock = feedbackText
    ? `<div style="margin:0;padding:12px 16px;background:#0f0f0f;border:1px solid #262626;border-radius:6px;font-size:13px;color:#e5e5e5;line-height:1.6;white-space:pre-wrap">${escapeHtml(feedbackText)}</div>`
    : `<p style="margin:0;font-size:13px;color:#525252;font-style:italic">No feedback provided.</p>`;

  const { error } = await resend.emails.send({
    from: "BIAS Alerts <alerts@streambias.com>",
    to: "luke@hfx-capital.com",
    subject: `[BIAS] Cancellation: ${reasonLabel}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5">
  <div style="max-width:560px;margin:40px auto;padding:0 16px">
    <div style="background:#141414;border:1px solid #262626;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 4px;font-size:18px;font-weight:600;color:#fafafa">Subscription cancelled</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#525252">${timestamp}</p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        <tbody>
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#737373;width:130px">User</td>
            <td style="padding:6px 0;font-size:13px;color:#fafafa">${escapeHtml(userEmail ?? "(unknown)")}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#737373">Tier</td>
            <td style="padding:6px 0;font-size:13px;color:#e5e5e5">${escapeHtml(tier)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#737373">Cadence</td>
            <td style="padding:6px 0;font-size:13px;color:#e5e5e5">${escapeHtml(cadenceLabel)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:12px;color:#737373">Reason</td>
            <td style="padding:6px 0;font-size:13px;color:#e5e5e5">${escapeHtml(reasonLabel)}</td>
          </tr>
        </tbody>
      </table>

      <h2 style="margin:0 0 8px;font-size:12px;font-weight:600;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.05em">Feedback</h2>
      ${feedbackBlock}
    </div>
  </div>
</body>
</html>
    `.trim(),
  });
  if (error) {
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  }
}

// Minimal HTML escape for values that could contain user-supplied text.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
