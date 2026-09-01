// api/_lib/lifecycle-email-template.ts
// Shared light/branded HTML shell for user-facing lifecycle emails (Welcome,
// Trial-ending reminder, Win-back). Distinct from the dark internal-alert
// template in downgrade-email.ts / cancellation-alert-email.ts.
//
// Structure (matches the source mockups verbatim so a client-side preview
// diff would produce zero changes):
//   f4f6f8 body → 560px card → gradient header (StreamBias logo + wordmark,
//   table-based for Outlook), chart-squiggle SVG divider, content block
//   (eyebrow / headline / intro / optional slot / CTA button), footer.
//
// Escape user-supplied text via escapeHtml() before passing into any *Html
// param — the template does NOT escape for you; callers keep control over
// where inline <strong>/<a> tags go.

export const APP_URL = "https://streambias.com";

// ── Public API ──────────────────────────────────────────────────────────────

export function renderLifecycleEmail(opts: {
  eyebrow: string;
  headline: string;
  /** Optional personalized greeting line (e.g. "Hi Luke,") rendered above the intro. */
  greetingHtml?: string;
  introHtml: string;
  contentHtml?: string;
  ctaLabel: string;
  ctaHref: string;
}): string {
  const { eyebrow, headline, greetingHtml, introHtml, contentHtml = "", ctaLabel, ctaHref } = opts;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="background:#f4f6f8;padding:24px;max-width:560px;margin:0 auto;">
    <div style="background:#ffffff;border-radius:8px;overflow:hidden;border:0.5px solid #e5e7eb;">
      ${HEADER_HTML}
      <div style="padding:8px 32px 0;">
        ${DIVIDER_SVG}
      </div>
      <div style="padding:8px 32px 8px;">
        <p style="font-size:12px;color:#0092ce;font-weight:500;letter-spacing:0.04em;margin:0 0 10px;text-transform:uppercase;">${eyebrow}</p>
        <h1 style="font-size:23px;font-weight:500;color:#0a0a0a;margin:0 0 14px;line-height:1.3;">${headline}</h1>
        ${greetingHtml ? `<p style="font-size:15px;color:#0a0a0a;margin:0 0 10px;">${greetingHtml}</p>` : ""}
        <p style="font-size:15px;color:#4a4a4a;line-height:1.7;margin:0 0 22px;">${introHtml}</p>
${contentHtml}
        <a href="${ctaHref}" style="display:inline-block;background:linear-gradient(135deg,#01477e,#0092ce);color:#ffffff;font-size:14px;font-weight:500;padding:13px 26px;border-radius:6px;text-decoration:none;">${ctaLabel}</a>
      </div>
      <div style="padding:20px 32px;background:#fafafa;border-top:1px solid #efefef;">
        <p style="font-size:12px;color:#9a9a9a;margin:0;line-height:1.6;">Questions? Reply to this email — a real person reads it.<br>StreamBias, sent from team@streambias.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function checklistItemHtml(
  items: { title: string; body: string }[],
  opts?: { iconVariant?: "empty" | "pause" },
): string {
  const variant = opts?.iconVariant ?? "empty";
  const iconInner = variant === "pause" ? PAUSE_ICON_SVG : EMPTY_ICON_SVG;

  const rows = items
    .map((item, i) => {
      const isLast = i === items.length - 1;
      const bottomBorder = isLast ? "" : "border-bottom:1px solid #efefef;";
      return `        <tr>
          <td style="padding:16px 0;${bottomBorder}vertical-align:top;width:44px;">
            <div style="width:32px;height:32px;border-radius:8px;background:#e3f2fa;display:flex;align-items:center;justify-content:center;">
              ${iconInner}
            </div>
          </td>
          <td style="padding:16px 0;${bottomBorder}vertical-align:top;">
            <p style="font-size:14px;font-weight:500;color:#0a0a0a;margin:0 0 3px;">${item.title}</p>
            <p style="font-size:13px;color:#7a7a7a;margin:0;line-height:1.5;">${item.body}</p>
          </td>
        </tr>`;
    })
    .join("\n");

  return `        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #efefef;">
${rows}
        </table>`;
}

/** Minimal HTML escape helper — callers should wrap any user-supplied text before interpolating. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format a date as "D Month" in en-GB (e.g. "3 September"). */
export function formatDayMonth(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

// ── Reusable HTML fragments ─────────────────────────────────────────────────

// Gradient header with StreamBias SVG logo + wordmark. Table-based (not flex)
// for Outlook compat; both logo paths are white for placement on the blue band.
const HEADER_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#01477e,#0092ce);">
        <tr>
          <td style="padding:22px 32px;text-align:left;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;">
              <tr>
                <td style="padding-right:9px;vertical-align:middle;">
                  <svg viewBox="0 0 2000 2000" style="width:24px;height:24px;display:block;">
                    <path d="M966.096,1034.65c-22.754-27.625-69.346-55.886-102.216-68.144-36.946-13.778-60.656-17.137-96.231-34.679-27.058-13.343-56.439-31.135-62.232-62.543-8.394-45.509,26.465-76.087,65.207-83.711,50.611-9.96,102.216,17.623,118.663,67.993.387,1.184,3.827,12.194,4.26,12.194.003,0,91.153-.661,91.201-.661-.847-6.944-6.841-31.044-13.658-46.482-22.403-50.737-58.306-89.826-111.718-106.701-46.474-14.683-98.465-12.364-143.461,6.356-23.651,9.84-45.367,24.363-62.924,43.069-31.058,33.092-40.048,80.048-36.128,124.686,9.693,110.373,123.031,127.96,200.026,155.673,16.723,6.019,33.389,11.877,48.507,21.439,36.014,22.778,56.2,62.211,37.847,103.687-21.695,49.03-82.751,55.489-128.876,39.17-8.601-3.043-16.857-7.076-24.448-12.148-16.955-11.328-30.141-22.695-36.876-41.77h92.236c6.203,12.813,19.328,21.65,34.519,21.65,21.17,0,38.331-17.161,38.331-38.331s-17.161-38.331-38.331-38.331c-15.19,0-28.315,8.837-34.519,21.65h-100.551c-2.16-7.913-5.078-15.541-10.103-22.31-15.861-21.368-42.296-18.945-58.378-9.252-33.302,20.073-16.845,74.125-11.455,91.421,28.402,91.137,131.539,129.795,220.24,116.529,79.203-11.846,152.177-72.27,155.139-155.888,1.372-38.733-9.367-74.572-34.072-104.565Z" fill="#ffffff"/>
                    <path d="M1270.084,991.072c19.65-7.266,37.281-18.7,51.813-33.232,26.037-26.049,42.149-62.024,42.149-101.763,0-79.477-64.434-143.911-143.911-143.911h-219.85v290.969l84.879-84.879v-122.884h108.376c42.944,0,77.756,34.811,77.756,77.756,0,21.478-8.703,40.914-22.772,54.983-14.069,14.069-33.517,22.772-54.983,22.772h-87.266l-102.57,102.57c12.965,25.907,18.937,54.865,17.821,86.518-.962,26.999-8.18,52.609-21.241,75.879v71.974h233.16c41.591,0,79.24-16.86,106.5-44.12,27.248-27.248,44.108-64.909,44.108-106.5,0-70.549-48.489-129.759-113.968-146.131ZM1293.117,1119.525c0,45.2-36.64,81.84-81.852,81.84h-126.102v-165.389h126.102c45.212,0,81.852,36.64,81.852,81.84v1.71Z" fill="#ffffff"/>
                  </svg>
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:16px;font-weight:500;color:#ffffff;letter-spacing:-0.01em;white-space:nowrap;">StreamBias</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;

// Thin chart-squiggle divider under the header, brand-cyan on the light card.
const DIVIDER_SVG = `<svg width="100%" height="46" viewBox="0 0 496 46" preserveAspectRatio="none" style="display:block;margin-top:-1px;">
          <polyline points="0,36 40,30 80,38 120,18 160,26 200,8 240,20 280,12 320,24 360,14 400,22 440,10 496,16" fill="none" stroke="#e3f2fa" stroke-width="3"/>
        </svg>`;

// Empty (checklist) icon — hollow cyan-bordered rounded square.
const EMPTY_ICON_SVG = `<div style="width:14px;height:14px;border:2px solid #0092ce;border-radius:3px;"></div>`;

// Pause icon — two vertical bars in cyan, matches the win-back mockup.
const PAUSE_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0092ce" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
