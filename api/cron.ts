import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { undeployExcessBrokerConnections } from "./_lib/undeploy.js";
import { maxLinkedAccountsForTier } from "./_lib/tier-limits.js";

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

// ── Dispatcher ────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = makeSupabase();
  const { job } = req.query;

  if (job === "downgrade-enforce") return handleDowngradeEnforce(supabase, res);
  if (job === "orphan-detect")     return handleOrphanDetect(supabase, res);

  return res.status(400).json({ error: "Unknown job. Use ?job=downgrade-enforce or ?job=orphan-detect" });
}
