/**
 * Local admin tool: lists deployed MetaApi broker connections with per-user
 * subscription tier/status. Run with env vars loaded:
 *
 *   node --env-file=.env.local scripts/cost-summary.mjs
 *   # or: source .env.local && node scripts/cost-summary.mjs
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: connections, error: connErr } = await supabase
  .from("broker_connections")
  .select("user_id, deploy_state, platform, server, created_at")
  .not("deploy_state", "eq", "UNDEPLOYED")
  .not("metaapi_account_id", "is", null)
  .order("created_at", { ascending: false });

if (connErr) { console.error("Failed:", connErr.message); process.exit(1); }

const userIds = [...new Set((connections ?? []).map((c) => c.user_id))];

const [profilesRes, authUsersRes] = await Promise.all([
  supabase.from("profiles").select("id, subscription_tier, subscription_status").in("id", userIds),
  supabase.auth.admin.listUsers({ perPage: 1000 }),
]);

const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
const emailById   = new Map((authUsersRes.data?.users ?? []).map((u) => [u.id, u.email ?? null]));

const countByUser = new Map();
for (const c of connections ?? []) {
  countByUser.set(c.user_id, (countByUser.get(c.user_id) ?? 0) + 1);
}

const rows = [...countByUser.entries()]
  .map(([userId, count]) => {
    const profile = profileById.get(userId);
    return {
      email: emailById.get(userId) ?? userId,
      tier:   profile?.subscription_tier   ?? "—",
      status: profile?.subscription_status ?? "—",
      count,
    };
  })
  .sort((a, b) => b.count - a.count);

console.log(`\nDeployed MetaApi accounts: ${connections?.length ?? 0} total\n`);
console.table(rows);
