import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Format a Date to MetaStats time string: "YYYY-MM-DD HH:mm:ss.SSS"
function toMetaStatsTime(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 23);
}

function mapDeal(deal: any, userId: string, linkedAccountId: string) {
  const closeStr: string = deal.closeTime ?? deal.openTime;
  const date = closeStr.slice(0, 10);
  const entryTime = (deal.openTime as string).slice(11, 16);
  const exitTime = deal.closeTime ? (deal.closeTime as string).slice(11, 16) : null;
  const type = deal.type === "BUY" ? "Long" : "Short";
  const status =
    deal.success === "won" ? "win" : deal.success === "lost" ? "loss" : "breakeven";

  return {
    user_id: userId,
    date,
    pair: deal.symbol ?? "UNKNOWN",
    type,
    entry: deal.openPrice ?? null,
    exit: deal.closePrice ?? null,
    lots: deal.volume ?? null,
    pnl: deal.profit ?? null,
    status,
    notes: deal.comment ?? null,
    account_id: linkedAccountId,
    source: "synced",
    broker_deal_id: deal._id,
    entry_time: entryTime,
    exit_time: exitTime,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const rawAuth = req.headers.authorization;
  const token = rawAuth?.startsWith("Bearer ") ? rawAuth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { linkedAccountId } = (req.body ?? {}) as { linkedAccountId?: string };
  if (!linkedAccountId) return res.status(400).json({ error: "linkedAccountId is required" });

  // Verify account belongs to user and get connection details
  const { data: bc } = await supabase
    .from("broker_connections")
    .select("id, metaapi_account_id, metastats_enabled, last_synced_at, last_deployed_at")
    .eq("account_id", linkedAccountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!bc) return res.status(200).json({ synced: 0, reason: "no_connection" });

  // MetaStats is enabled lazily: the account is still DEPLOYING when broker-connect
  // returns, so we defer enableMetaStatsApi() to the first sync poll after deploy.
  if (!bc.metastats_enabled) {
    try {
      // @ts-ignore
      const { default: MetaApi } = await import("metaapi.cloud-sdk/node");
      const api = new (MetaApi as any)(process.env.METAAPI_TOKEN!);
      const account = await api.metatraderAccountApi.getAccount(bc.metaapi_account_id);
      await account.enableMetaStatsApi();
      await supabase
        .from("broker_connections")
        .update({ metastats_enabled: true })
        .eq("id", bc.id);
      bc.metastats_enabled = true;
    } catch (err) {
      console.error(
        "[broker-sync] enableMetaStatsApi failed (account may still be deploying):",
        err instanceof Error ? err.message : err,
      );
      return res.status(200).json({ synced: 0, reason: "metastats_not_ready" });
    }
  }

  const now = new Date();
  const startDate: Date = bc.last_synced_at
    ? new Date(bc.last_synced_at)
    : bc.last_deployed_at
    ? new Date(bc.last_deployed_at)
    : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const startTime = toMetaStatsTime(startDate);
  const endTime = toMetaStatsTime(now);

  // Fetch from MetaStats (updateHistory: false = reads cached data, not billable)
  let deals: any[] = [];
  try {
    // @ts-ignore — tsconfig.api.json uses moduleResolution:node which can't resolve exports maps; runtime resolves correctly
    const { default: MetaStats } = await import("metaapi.cloud-metastats-sdk");
    const metaStats = new (MetaStats as any)(process.env.METAAPI_TOKEN!);
    deals = await metaStats.getAccountTrades(bc.metaapi_account_id, startTime, endTime, false);
  } catch (err) {
    console.error(
      "[broker-sync] MetaStats fetch failed:",
      err instanceof Error ? err.message : err,
    );
    return res.status(502).json({ error: "MetaStats unavailable. Try again later." });
  }

  // Only import closed BUY/SELL entries (skip balance changes, credits, etc.)
  const rows = deals
    .filter((d) => d.type === "BUY" || d.type === "SELL")
    .map((d) => mapDeal(d, user.id, linkedAccountId));

  let synced = 0;
  if (rows.length > 0) {
    // DB-level dedup via unique constraint on (account_id, broker_deal_id).
    // ignoreDuplicates silently drops conflicts — concurrent syncs are safe.
    const { data: inserted, error: upsertErr } = await supabase
      .from("trades")
      .upsert(rows, { onConflict: "account_id,broker_deal_id", ignoreDuplicates: true })
      .select("id");
    if (upsertErr) {
      console.error("[broker-sync] upsert failed:", upsertErr.message);
      return res.status(500).json({ error: "Failed to save trades." });
    }
    synced = inserted?.length ?? 0;
  }

  await supabase
    .from("broker_connections")
    .update({ last_synced_at: now.toISOString() })
    .eq("id", bc.id);

  return res.status(200).json({ synced });
}
