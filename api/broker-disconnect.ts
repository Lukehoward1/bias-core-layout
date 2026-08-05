import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }
  throw lastErr;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── 1. JWT auth ────────────────────────────────────────────────────────────

  const rawAuth = req.headers.authorization;
  const token = rawAuth?.startsWith("Bearer ") ? rawAuth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  // ── 2. Validate input ─────────────────────────────────────────────────────

  const body = req.body as { linkedAccountId?: string };
  const { linkedAccountId } = body;

  if (!linkedAccountId) {
    return res.status(400).json({ error: "linkedAccountId is required" });
  }

  // ── 3. Verify linked_accounts row belongs to this user ────────────────────

  const { data: linkedAccount, error: laError } = await supabase
    .from("linked_accounts")
    .select("id, is_primary")
    .eq("id", linkedAccountId)
    .eq("user_id", user.id)
    .single();

  if (laError || !linkedAccount) {
    return res.status(404).json({ error: "Account not found" });
  }

  // ── 4. Look up broker_connections row (absent for manual accounts) ─────────

  const { data: connection } = await supabase
    .from("broker_connections")
    .select("id, metaapi_account_id, deploy_state")
    .eq("account_id", linkedAccountId)
    .eq("user_id", user.id)
    .maybeSingle();

  // ── 5. MetaApi undeploy + remove (broker accounts only) ───────────────────

  if (connection?.metaapi_account_id) {
    // @ts-ignore — tsconfig.api.json uses moduleResolution:node which can't resolve exports maps; runtime resolves correctly
    const { default: MetaApi } = await import("metaapi.cloud-sdk/node");
    const api = new (MetaApi as any)(process.env.METAAPI_TOKEN!);

    try {
      await withRetry(async () => {
        let account;
        try {
          account = await api.metatraderAccountApi.getAccount(connection.metaapi_account_id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          // Already deleted from MetaApi — treat as success so DB cleanup can proceed
          if (msg.includes("not found") || msg.includes("404")) return;
          throw err;
        }

        if (account.state !== "UNDEPLOYED") {
          await account.undeploy();
          await account.reload();
        }
        await account.remove();
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(
        `[broker-disconnect] MetaApi undeploy+remove failed for ${connection.metaapi_account_id}:`,
        message,
      );
      return res.status(500).json({
        error: `Failed to disconnect account after 3 attempts: ${message}`,
      });
    }

    // Delete broker_connections row — MetaApi account is already gone
    const { error: bcErr } = await supabase
      .from("broker_connections")
      .delete()
      .eq("id", connection.id)
      .eq("user_id", user.id);

    if (bcErr) {
      console.error("[broker-disconnect] broker_connections delete failed:", bcErr.message);
    }
  }

  // ── 6. Delete linked_accounts row ─────────────────────────────────────────

  const { error: laDeleteErr } = await supabase
    .from("linked_accounts")
    .delete()
    .eq("id", linkedAccountId)
    .eq("user_id", user.id);

  if (laDeleteErr) {
    console.error("[broker-disconnect] linked_accounts delete failed:", laDeleteErr.message);
    return res.status(500).json({ error: "Failed to remove account record. Please try again." });
  }

  // ── 7. Promote new primary if the deleted account was primary ─────────────

  if (linkedAccount.is_primary) {
    const { data: remaining } = await supabase
      .from("linked_accounts")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (remaining?.[0]) {
      await supabase
        .from("linked_accounts")
        .update({ is_primary: true })
        .eq("id", remaining[0].id);
    }
  }

  return res.status(200).json({ success: true, linkedAccountId });
}
