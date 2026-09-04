import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { undeployExcessBrokerConnections } from "./_lib/undeploy.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { chosenLinkedAccountId } = req.body as { chosenLinkedAccountId?: string };
  if (!chosenLinkedAccountId) return res.status(400).json({ error: "chosenLinkedAccountId is required" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("downgrade_grace_end_at, downgrade_new_max")
    .eq("id", user.id)
    .single();

  if (!profile?.downgrade_grace_end_at) {
    return res.status(409).json({ error: "No pending downgrade" });
  }
  if (new Date(profile.downgrade_grace_end_at) < new Date()) {
    return res.status(409).json({ error: "Grace period has expired" });
  }

  const { data: chosenAccount } = await supabase
    .from("linked_accounts")
    .select("id")
    .eq("id", chosenLinkedAccountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!chosenAccount) return res.status(404).json({ error: "Account not found" });

  // Promote chosen account to primary. Both writes must succeed before we
  // clear the grace columns or run undeploy — otherwise the wrong account
  // (or no account) could get undeployed while grace is marked resolved.
  const { error: clearError } = await supabase
    .from("linked_accounts")
    .update({ is_primary: false })
    .eq("user_id", user.id);

  if (clearError) {
    console.error(`[broker-downgrade-resolve] clear primaries failed for user ${user.id}:`, clearError.message);
    return res.status(500).json({ error: "Failed to update primary account" });
  }

  const { data: promoted, error: setError } = await supabase
    .from("linked_accounts")
    .update({ is_primary: true })
    .eq("id", chosenLinkedAccountId)
    .eq("user_id", user.id)
    .select();

  if (setError) {
    console.error(`[broker-downgrade-resolve] set primary failed for user ${user.id}:`, setError.message);
    return res.status(500).json({ error: "Failed to update primary account" });
  }

  if (!promoted || promoted.length === 0) {
    console.error(`[broker-downgrade-resolve] set primary updated 0 rows for user ${user.id} account ${chosenLinkedAccountId}`);
    return res.status(500).json({ error: "Failed to update primary account" });
  }

  // Undeploy excess — primary is now set to the chosen account, so it's kept.
  // Run this BEFORE clearing grace so that if it throws (defensively — it
  // swallows its own errors internally, but the MetaApi import could fail
  // in ways we don't cover), grace stays pending and the user's retry
  // re-runs the whole flow. Primary flip and undeploy are both idempotent,
  // so retries are safe. Partial per-connection undeploy failures are still
  // handled asynchronously by the orphan-detect cron.
  await undeployExcessBrokerConnections(supabase, user.id, profile.downgrade_new_max ?? 1);

  // Clear grace columns last — this is the "resolve complete" marker. If it
  // fails, don't mark resolved; user retries safely (all prior steps are
  // idempotent).
  const { error: graceError } = await supabase.from("profiles").update({
    downgrade_grace_end_at: null,
    downgrade_new_max: null,
    downgrade_account_chosen: null,
  }).eq("id", user.id);

  if (graceError) {
    console.error(`[broker-downgrade-resolve] clear grace columns failed for user ${user.id}:`, graceError.message);
    return res.status(500).json({ error: "Failed to clear downgrade grace period" });
  }

  console.log(`[broker-downgrade-resolve] user ${user.id} kept account ${chosenLinkedAccountId}`);
  return res.status(200).json({ success: true });
}
