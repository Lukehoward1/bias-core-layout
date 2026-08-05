import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { undeployExcessBrokerConnections } from "../_lib/undeploy.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

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

    // Self-resolve check: if the user already has ≤ newMax accounts (e.g. manually
    // disconnected during the grace period), just clear the grace columns.
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

    // Enforce: undeploy excess (keeps primary first, then oldest)
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
