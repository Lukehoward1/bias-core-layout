import { Resend } from "resend";

export async function sendDowngradeGraceEmail({
  to,
  graceEndAt,
  accountCount,
  newMax,
}: {
  to: string;
  graceEndAt: Date;
  accountCount: number;
  newMax: number;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const deadline = graceEndAt.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hfx-capital.com";

  await resend.emails.send({
    from: "BIAS <alerts@streambias.com>",
    to,
    subject: "Action needed: choose which broker account to keep",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5">
  <div style="max-width:560px;margin:40px auto;padding:0 16px">
    <div style="background:#141414;border:1px solid #262626;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#fafafa">Action needed: choose which account to keep</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3;line-height:1.6">
        Your plan was changed. You currently have <strong style="color:#fafafa">${accountCount} broker account${accountCount === 1 ? "" : "s"}</strong> connected,
        but your new plan allows <strong style="color:#fafafa">${newMax}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3;line-height:1.6">
        Please visit your account settings and choose which account to keep.
        If you don't choose by <strong style="color:#fafafa">${deadline}</strong>,
        we'll automatically keep your primary account and disconnect the rest.
      </p>
      <a href="${appUrl}/settings/accounts"
         style="display:inline-block;background:#ffffff;color:#0a0a0a;font-size:14px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none">
        Choose account
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#525252;line-height:1.6">
        You're receiving this because you have a BIAS subscription. Questions? Reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  });
}
