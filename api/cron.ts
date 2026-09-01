import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { undeployExcessBrokerConnections } from "./_lib/undeploy.js";
import { maxLinkedAccountsForTier } from "./_lib/tier-limits.js";
import { sendTrialEndingEmail } from "./_lib/trial-ending-email.js";
import { sendWinbackEmail } from "./_lib/winback-email.js";

// ── Shared auth ────────────────────────────────────────────────────────────────

function authorized(req: VercelRequest): boolean {
  return req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
}

function makeSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── downgrade-enforce ─────────────────────────────────────────────────────────
// Runs at 00:00 UTC daily. Finds profiles whose downgrade grace period has
// expired and enforces the new account limit by undeploying excess connections.

async function handleDowngradeEnforce(supabase: ReturnType<typeof makeSupabase>, res: VercelResponse) {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, downgrade_new_max")
    .not("downgrade_grace_end_at", "is", null)
    .lt("downgrade_grace_end_at", new Date().toISOString());

  if (error) {
    console.error("[cron/downgrade-enforce] failed to query profiles:", error.message);
    return res.status(500).json({ error: error.message });
  }

  if (!profiles?.length) {
    return res.status(200).json({ resolved: 0 });
  }

  let resolved = 0;
  for (const profile of profiles) {
    const newMax = profile.downgrade_new_max ?? 0;

    // Self-resolve: user already within limit (disconnected manually during grace period)
    const { count } = await supabase
      .from("linked_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id);

    if ((count ?? 0) <= newMax) {
      await supabase.from("profiles").update({
        downgrade_grace_end_at: null,
        downgrade_new_max: null,
        downgrade_account_chosen: null,
      }).eq("id", profile.id);
      resolved++;
      console.log(`[cron/downgrade-enforce] user ${profile.id} already within limit — cleared`);
      continue;
    }

    await undeployExcessBrokerConnections(supabase, profile.id, newMax);

    await supabase.from("profiles").update({
      downgrade_grace_end_at: null,
      downgrade_new_max: null,
      downgrade_account_chosen: null,
    }).eq("id", profile.id);

    resolved++;
    console.log(`[cron/downgrade-enforce] enforced downgrade for user ${profile.id} (max=${newMax})`);
  }

  return res.status(200).json({ resolved });
}

// ── orphan-detect ─────────────────────────────────────────────────────────────
// Runs at 06:00 UTC daily. Finds deployed MetaApi connections that exceed the
// user's current plan limit (payment failure, manual admin action, etc.) and
// undeployes them. Always emails admin with a full deployed-accounts summary.

interface DeployedUser {
  userId: string;
  email: string | null;
  tier: string | null;
  status: string | null;
  deployedCount: number;
  maxAllowed: number;
  orphanCount: number;
}

const ADMIN_EMAIL = "luke@hfx-capital.com";

async function handleOrphanDetect(supabase: ReturnType<typeof makeSupabase>, res: VercelResponse) {
  const { data: connections, error: connErr } = await supabase
    .from("broker_connections")
    .select("id, user_id, account_id, deploy_state")
    .not("deploy_state", "eq", "UNDEPLOYED")
    .not("metaapi_account_id", "is", null);

  if (connErr) {
    console.error("[cron/orphan-detect] failed to fetch broker_connections:", connErr.message);
    return res.status(500).json({ error: connErr.message });
  }

  if (!connections?.length) {
    console.log("[cron/orphan-detect] no deployed connections found");
    return res.status(200).json({ swept: 0, deployedTotal: 0 });
  }

  const countByUser = new Map<string, number>();
  for (const c of connections) {
    countByUser.set(c.user_id, (countByUser.get(c.user_id) ?? 0) + 1);
  }

  const userIds = [...countByUser.keys()];

  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, subscription_tier, subscription_status")
    .in("id", userIds);

  if (profErr) {
    console.error("[cron/orphan-detect] failed to fetch profiles:", profErr.message);
    return res.status(500).json({ error: profErr.message });
  }

  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) {
    console.error("[cron/orphan-detect] failed to list auth users:", authErr.message);
  }
  const emailById = new Map<string, string>();
  for (const u of authUsers ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const summary: DeployedUser[] = [];
  let totalOrphaned = 0;

  for (const [userId, deployedCount] of countByUser) {
    const profile = profileById.get(userId);
    const tier = profile?.subscription_tier ?? null;
    const status = profile?.subscription_status ?? null;
    const maxAllowed = maxLinkedAccountsForTier(tier, status);
    const orphanCount = Math.max(0, deployedCount - maxAllowed);

    summary.push({ userId, email: emailById.get(userId) ?? null, tier, status, deployedCount, maxAllowed, orphanCount });

    if (orphanCount > 0) {
      console.log(
        `[cron/orphan-detect] user ${userId} has ${deployedCount} deployed, max=${maxAllowed} — undeploying ${orphanCount}`,
      );
      await undeployExcessBrokerConnections(supabase, userId, maxAllowed);
      totalOrphaned += orphanCount;
    }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const orphanRows = summary.filter((u) => u.orphanCount > 0);
    const allRows = summary.sort((a, b) => b.deployedCount - a.deployedCount);

    const tableRows = allRows
      .map(
        (u) =>
          `<tr style="border-bottom:1px solid #262626">
            <td style="padding:8px 12px;font-size:12px;color:#a3a3a3">${u.email ?? u.userId}</td>
            <td style="padding:8px 12px;font-size:12px;color:#e5e5e5;text-align:center">${u.deployedCount}</td>
            <td style="padding:8px 12px;font-size:12px;color:#e5e5e5;text-align:center">${u.maxAllowed}</td>
            <td style="padding:8px 12px;font-size:12px;color:#e5e5e5">${u.tier ?? "—"}</td>
            <td style="padding:8px 12px;font-size:12px;color:#e5e5e5">${u.status ?? "—"}</td>
            <td style="padding:8px 12px;font-size:12px;text-align:center;color:${u.orphanCount > 0 ? "#ef4444" : "#22c55e"}">${u.orphanCount > 0 ? `⚠ ${u.orphanCount} swept` : "✓"}</td>
          </tr>`,
      )
      .join("");

    const subject = orphanRows.length > 0
      ? `[BIAS] Orphan sweep: ${totalOrphaned} account${totalOrphaned === 1 ? "" : "s"} undeployed`
      : "[BIAS] Orphan sweep: all clear";

    await resend.emails.send({
      from: "BIAS Alerts <alerts@streambias.com>",
      to: ADMIN_EMAIL,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5">
  <div style="max-width:720px;margin:40px auto;padding:0 16px">
    <div style="background:#141414;border:1px solid #262626;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 4px;font-size:18px;font-weight:600;color:#fafafa">Daily orphan sweep</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#525252">${new Date().toUTCString()}</p>
      ${
        orphanRows.length === 0
          ? `<p style="margin:0 0 24px;font-size:14px;color:#22c55e">✓ No orphaned accounts found. All deployed accounts are within plan limits.</p>`
          : `<p style="margin:0 0 16px;font-size:14px;color:#ef4444">⚠ ${totalOrphaned} account${totalOrphaned === 1 ? "" : "s"} undeployed across ${orphanRows.length} user${orphanRows.length === 1 ? "" : "s"}.</p>`
      }
      <h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.05em">Deployed accounts (${connections.length} total)</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #262626;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#1a1a1a">
            <th style="padding:8px 12px;font-size:11px;color:#737373;text-align:left;font-weight:500">User</th>
            <th style="padding:8px 12px;font-size:11px;color:#737373;text-align:center;font-weight:500">Deployed</th>
            <th style="padding:8px 12px;font-size:11px;color:#737373;text-align:center;font-weight:500">Max</th>
            <th style="padding:8px 12px;font-size:11px;color:#737373;text-align:left;font-weight:500">Tier</th>
            <th style="padding:8px 12px;font-size:11px;color:#737373;text-align:left;font-weight:500">Status</th>
            <th style="padding:8px 12px;font-size:11px;color:#737373;text-align:center;font-weight:500">Action</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </div>
</body>
</html>
      `.trim(),
    });
  } catch (emailErr) {
    console.error("[cron/orphan-detect] failed to send summary email:", emailErr instanceof Error ? emailErr.message : emailErr);
  }

  return res.status(200).json({ swept: totalOrphaned, deployedTotal: connections.length });
}

// ── cancellation-digest ───────────────────────────────────────────────────────
// Runs weekly (Fridays 08:00 UTC). Aggregates cancellation_feedback from the
// last 7 days into a summary: reason breakdown (table) + full list of any
// free-text feedback entries. Complements the real-time per-cancellation
// alerts fired by api/subscription.ts:handleCancel.

interface CancellationRow {
  user_id: string;
  tier_at_cancellation: string;
  cadence_at_cancellation: string | null;
  reason: string;
  feedback_text: string | null;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  too_expensive:       "Too expensive",
  not_using_enough:    "Not using it enough",
  missing_feature:     "Missing a feature",
  switched_competitor: "Switched to a competitor",
  technical_issues:    "Technical issues",
  other:               "Other",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function handleCancellationDigest(supabase: ReturnType<typeof makeSupabase>, res: VercelResponse) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("cancellation_feedback")
    .select("user_id, tier_at_cancellation, cadence_at_cancellation, reason, feedback_text, created_at")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[cron/cancellation-digest] failed to query feedback:", error.message);
    return res.status(500).json({ error: error.message });
  }

  const cancellations = (rows ?? []) as CancellationRow[];

  // Map user_ids → emails, matching orphan-detect's listUsers pattern.
  const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) {
    console.error("[cron/cancellation-digest] failed to list auth users:", authErr.message);
  }
  const emailById = new Map<string, string>();
  for (const u of authUsers ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  // Group + count by reason.
  const countByReason = new Map<string, number>();
  for (const c of cancellations) {
    countByReason.set(c.reason, (countByReason.get(c.reason) ?? 0) + 1);
  }
  const reasonRows = [...countByReason.entries()].sort((a, b) => b[1] - a[1]);

  const feedbackEntries = cancellations.filter((c) => c.feedback_text && c.feedback_text.trim().length > 0);

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const reasonTable = reasonRows
      .map(
        ([reason, count]) =>
          `<tr style="border-bottom:1px solid #262626">
            <td style="padding:8px 12px;font-size:12px;color:#e5e5e5">${escapeHtml(REASON_LABELS[reason] ?? reason)}</td>
            <td style="padding:8px 12px;font-size:12px;color:#fafafa;text-align:right;font-weight:600">${count}</td>
          </tr>`,
      )
      .join("");

    const feedbackBlocks = feedbackEntries
      .map(
        (c) => `
      <div style="margin:0 0 12px;padding:12px 16px;background:#0f0f0f;border:1px solid #262626;border-radius:6px">
        <p style="margin:0 0 6px;font-size:11px;color:#525252">
          ${escapeHtml(emailById.get(c.user_id) ?? "(unknown user)")} · ${escapeHtml(c.tier_at_cancellation)} · ${escapeHtml(REASON_LABELS[c.reason] ?? c.reason)} · ${new Date(c.created_at).toUTCString()}
        </p>
        <div style="font-size:13px;color:#e5e5e5;line-height:1.6;white-space:pre-wrap">${escapeHtml(c.feedback_text ?? "")}</div>
      </div>`,
      )
      .join("");

    const subject = cancellations.length === 0
      ? "[BIAS] Weekly cancellations: none this week"
      : `[BIAS] Weekly cancellations: ${cancellations.length} in the last 7 days`;

    await resend.emails.send({
      from: "BIAS Alerts <alerts@streambias.com>",
      to: ADMIN_EMAIL,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5">
  <div style="max-width:720px;margin:40px auto;padding:0 16px">
    <div style="background:#141414;border:1px solid #262626;border-radius:12px;padding:32px">
      <h1 style="margin:0 0 4px;font-size:18px;font-weight:600;color:#fafafa">Weekly cancellation digest</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#525252">${new Date().toUTCString()} · Last 7 days</p>
      ${
        cancellations.length === 0
          ? `<p style="margin:0 0 24px;font-size:14px;color:#22c55e">✓ No cancellations in the last 7 days.</p>`
          : `<p style="margin:0 0 16px;font-size:14px;color:#e5e5e5">${cancellations.length} cancellation${cancellations.length === 1 ? "" : "s"} recorded.</p>`
      }
      ${
        reasonRows.length === 0
          ? ""
          : `<h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.05em">Reason breakdown</h2>
             <table style="width:100%;border-collapse:collapse;border:1px solid #262626;border-radius:8px;overflow:hidden;margin:0 0 24px">
               <thead>
                 <tr style="background:#1a1a1a">
                   <th style="padding:8px 12px;font-size:11px;color:#737373;text-align:left;font-weight:500">Reason</th>
                   <th style="padding:8px 12px;font-size:11px;color:#737373;text-align:right;font-weight:500">Count</th>
                 </tr>
               </thead>
               <tbody>${reasonTable}</tbody>
             </table>`
      }
      ${
        feedbackEntries.length === 0
          ? ""
          : `<h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#a3a3a3;text-transform:uppercase;letter-spacing:0.05em">Free-text feedback (${feedbackEntries.length})</h2>
             ${feedbackBlocks}`
      }
    </div>
  </div>
</body>
</html>
      `.trim(),
    });
  } catch (emailErr) {
    console.error("[cron/cancellation-digest] failed to send digest email:", emailErr instanceof Error ? emailErr.message : emailErr);
  }

  return res.status(200).json({ digested: cancellations.length });
}

// ── trial-ending-reminder ─────────────────────────────────────────────────────
// Runs daily (09:00 UTC). Finds trialing profiles whose trial ends within the
// next 24h and haven't yet been reminded. Fetches the underlying Stripe price
// to compute a live "£X/month|year" amount label so the copy is accurate.
// Marks each profile as reminded on success; per-user failures are logged but
// don't abort the batch (matches handleDowngradeEnforce's style).

async function handleTrialEndingReminder(supabase: ReturnType<typeof makeSupabase>, res: VercelResponse) {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, stripe_subscription_id, trial_ends_at")
    .eq("subscription_status", "trialing")
    .not("trial_ends_at", "is", null)
    .gte("trial_ends_at", now.toISOString())
    .lte("trial_ends_at", in24h.toISOString())
    .is("trial_reminder_sent_at", null);

  if (error) {
    console.error("[cron/trial-ending-reminder] failed to query profiles:", error.message);
    return res.status(500).json({ error: error.message });
  }

  if (!profiles?.length) {
    return res.status(200).json({ sent: 0 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let sent = 0;

  for (const profile of profiles) {
    if (!profile.email) {
      console.error(`[cron/trial-ending-reminder] user ${profile.id} has no email — skipping`);
      continue;
    }

    // Best-effort price lookup: on any Stripe error, fall back to a generic
    // amount label rather than skip the whole send — user still gets the
    // reminder, just with less-specific copy.
    let amountLabel = "your plan price";
    try {
      if (profile.stripe_subscription_id) {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        const price = subscription.items?.data?.[0]?.price;
        if (price?.unit_amount != null && price.recurring?.interval) {
          amountLabel = `£${(price.unit_amount / 100).toFixed(2)}/${price.recurring.interval}`;
        }
      }
    } catch (priceErr) {
      console.error(
        `[cron/trial-ending-reminder] price lookup failed for user ${profile.id}:`,
        priceErr instanceof Error ? priceErr.message : priceErr,
      );
    }

    try {
      await sendTrialEndingEmail({
        to: profile.email,
        fullName: profile.full_name ?? null,
        trialEndsAt: profile.trial_ends_at ? new Date(profile.trial_ends_at) : null,
        amountLabel,
      });
      await supabase
        .from("profiles")
        .update({ trial_reminder_sent_at: new Date().toISOString() })
        .eq("id", profile.id);
      sent++;
      console.log(`[cron/trial-ending-reminder] sent to user ${profile.id}`);
    } catch (sendErr) {
      console.error(
        `[cron/trial-ending-reminder] send failed for user ${profile.id}:`,
        sendErr instanceof Error ? sendErr.message : sendErr,
      );
    }
  }

  return res.status(200).json({ sent });
}

// ── winback ──────────────────────────────────────────────────────────────────
// Runs daily (10:00 UTC). Finds cancelled profiles whose cancellation lands
// between 3 and 4 days ago (so each user hits exactly once) and haven't yet
// been sent the winback. Marks each profile as sent on success; per-user
// failures are logged but don't abort the batch.

async function handleWinback(supabase: ReturnType<typeof makeSupabase>, res: VercelResponse) {
  const now = Date.now();
  const fourDaysAgo  = new Date(now - 4 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, cancelled_at")
    .eq("subscription_status", "cancelled")
    .not("cancelled_at", "is", null)
    .gte("cancelled_at", fourDaysAgo.toISOString())
    .lte("cancelled_at", threeDaysAgo.toISOString())
    .is("winback_sent_at", null);

  if (error) {
    console.error("[cron/winback] failed to query profiles:", error.message);
    return res.status(500).json({ error: error.message });
  }

  if (!profiles?.length) {
    return res.status(200).json({ sent: 0 });
  }

  let sent = 0;

  for (const profile of profiles) {
    if (!profile.email) {
      console.error(`[cron/winback] user ${profile.id} has no email — skipping`);
      continue;
    }

    try {
      await sendWinbackEmail({
        to: profile.email,
        fullName: profile.full_name ?? null,
        cancelledAt: profile.cancelled_at ? new Date(profile.cancelled_at) : null,
      });
      await supabase
        .from("profiles")
        .update({ winback_sent_at: new Date().toISOString() })
        .eq("id", profile.id);
      sent++;
      console.log(`[cron/winback] sent to user ${profile.id}`);
    } catch (sendErr) {
      console.error(
        `[cron/winback] send failed for user ${profile.id}:`,
        sendErr instanceof Error ? sendErr.message : sendErr,
      );
    }
  }

  return res.status(200).json({ sent });
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = makeSupabase();
  const { job } = req.query;

  if (job === "downgrade-enforce")     return handleDowngradeEnforce(supabase, res);
  if (job === "orphan-detect")         return handleOrphanDetect(supabase, res);
  if (job === "cancellation-digest")   return handleCancellationDigest(supabase, res);
  if (job === "trial-ending-reminder") return handleTrialEndingReminder(supabase, res);
  if (job === "winback")               return handleWinback(supabase, res);

  return res.status(400).json({
    error: "Unknown job. Use ?job=downgrade-enforce, ?job=orphan-detect, ?job=cancellation-digest, ?job=trial-ending-reminder, or ?job=winback",
  });
}
