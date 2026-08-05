import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const ADMIN_USER_ID = "bf56f6fc-99ab-4870-aba4-58fc18790011";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const rawAuth = req.headers.authorization;
  const token = rawAuth?.startsWith("Bearer ") ? rawAuth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });
  if (user.id !== ADMIN_USER_ID) return res.status(403).json({ error: "Forbidden" });

  // All deployed broker connections
  const { data: connections, error: connErr } = await supabase
    .from("broker_connections")
    .select("user_id, deploy_state, platform, server, created_at")
    .not("deploy_state", "eq", "UNDEPLOYED")
    .not("metaapi_account_id", "is", null)
    .order("created_at", { ascending: false });

  if (connErr) return res.status(500).json({ error: connErr.message });

  const userIds = [...new Set((connections ?? []).map((c) => c.user_id))];

  const [profilesRes, authUsersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, subscription_tier, subscription_status")
      .in("id", userIds),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p]),
  );
  const emailById = new Map(
    (authUsersRes.data?.users ?? []).map((u) => [u.id, u.email ?? null]),
  );

  // Group deployed counts per user
  const countByUser = new Map<string, number>();
  for (const c of connections ?? []) {
    countByUser.set(c.user_id, (countByUser.get(c.user_id) ?? 0) + 1);
  }

  const perUser = [...countByUser.entries()]
    .map(([userId, count]) => {
      const profile = profileById.get(userId);
      return {
        userId,
        email: emailById.get(userId) ?? null,
        tier: profile?.subscription_tier ?? null,
        status: profile?.subscription_status ?? null,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return res.status(200).json({
    deployedAccounts: connections?.length ?? 0,
    perUser,
    generatedAt: new Date().toISOString(),
  });
}
