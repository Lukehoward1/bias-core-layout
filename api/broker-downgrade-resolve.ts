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

  // Promote chosen account to primary
  await supabase.from("linked_accounts").update({ is_primary: false }).eq("user_id", user.id);
  await supabase.from("linked_accounts").update({ is_primary: true }).eq("id", chosenLinkedAccountId);

  // Clear grace columns
  await supabase.from("profiles").update({
    downgrade_grace_end_at: null,
    downgrade_new_max: null,
    downgrade_account_chosen: null,
  }).eq("id", user.id);

  // Undeploy excess — primary is now set to the chosen account, so it's kept
  await undeployExcessBrokerConnections(supabase, user.id, profile.downgrade_new_max ?? 1);

  console.log(`[broker-downgrade-resolve] user ${user.id} kept account ${chosenLinkedAccountId}`);
  return res.status(200).json({ success: true });
}
