import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, randomBytes } from "crypto";

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

// ── Encryption (AES-256-GCM) ──────────────────────────────────────────────────
// ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Stored format: hex(iv):hex(authTag):hex(ciphertext)

function encrypt(plaintext: string): string {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("ENCRYPTION_KEY env var must be a 64-character hex string (32 bytes)");
  }
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

// ── Tier limits ───────────────────────────────────────────────────────────────
// Authoritative server-side account limit. Mirrors PLAN_LIMITS in
// src/types/subscription.ts but uses the actual DB tier values (not the
// localStorage-based frontend plan names).

function maxLinkedAccountsForTier(
  tier: string | null,
  status: string | null,
): number {
  if (status !== "active" && status !== "trialing") return 0;
  switch (tier) {
    case "standard":        return 1;
    case "pro":             return 3;
    case "founding_member": return 1;
    default:                return 0;
  }
}

// ── MetaApi helpers ───────────────────────────────────────────────────────────

function friendlyMetaApiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("E_SRV_NOT_FOUND") || msg.toLowerCase().includes("server not found")) {
    return "Server not found. Check the server name — it must match exactly what your MT4/MT5 terminal shows (e.g. PepperstoneUK-Demo03).";
  }
  if (
    msg.includes("E_AUTH") ||
    msg.toLowerCase().includes("invalid credentials") ||
    msg.toLowerCase().includes("authentication failed")
  ) {
    return "Invalid login or password. Check your MT4/MT5 credentials and try again.";
  }
  return `Connection failed: ${msg}`;
}

async function cleanupMetaApiAccount(account: any): Promise<void> {
  try {
    if (account.state !== "UNDEPLOYED") {
      await account.undeploy();
    }
    await account.remove();
  } catch (err) {
    console.error(
      "[broker-connect] CRITICAL: MetaApi cleanup (undeploy+remove) failed for account",
      account.id,
      err instanceof Error ? err.message : err,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── 1. Verify caller via Supabase JWT ─────────────────────────────────────

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
  if (authError || !user) {
    console.error("[broker-connect] auth failed — error:", authError?.message ?? "none", "| user:", user ? "present" : "null");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Fail before any paid MetaApi work if the encryption key is misconfigured
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    console.error("[broker-connect] ENCRYPTION_KEY is missing or not a 64-char hex string");
    return res.status(500).json({ error: "Server configuration error. Please contact support." });
  }

  // ── 2. Validate body ──────────────────────────────────────────────────────

  const body = req.body as {
    login?: string;
    password?: string;
    server?: string;
    platform?: string;
  };
  const login    = body.login?.trim()  ?? "";
  const password = body.password       ?? "";
  const server   = body.server?.trim() ?? "";
  const platform = body.platform       ?? "";

  if (!login)    return res.status(400).json({ error: "MT login is required." });
  if (!password) return res.status(400).json({ error: "Investor password is required." });
  if (!server)   return res.status(400).json({ error: "Server is required." });
  if (platform !== "mt4" && platform !== "mt5")
    return res.status(400).json({ error: "Platform must be mt4 or mt5." });

  // ── 3. Check subscription tier limit ─────────────────────────────────────

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", user.id)
    .single();

  const maxAccounts = maxLinkedAccountsForTier(
    profile?.subscription_tier ?? null,
    profile?.subscription_status ?? null,
  );

  const { count: existingCount } = await supabase
    .from("linked_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((existingCount ?? 0) >= maxAccounts) {
    return res.status(403).json({
      error:
        maxAccounts === 0
          ? "Your plan does not include broker account connections."
          : "You've reached the account limit for your plan. Upgrade to add more accounts.",
    });
  }

  // ── 4. Duplicate-connection guard ────────────────────────────────────────
  // Prevents a second MetaApi provisioning fee if the same login+server is
  // submitted twice (retry, second tab, etc.).

  const { data: existing } = await supabase
    .from("broker_connections")
    .select("id")
    .eq("user_id", user.id)
    .eq("login", login)
    .eq("server", server)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({
      error: "An account with this login and server is already connected.",
    });
  }

  // ── 5. Create MetaApi account ─────────────────────────────────────────────

  const accountName = `${platform.toUpperCase()} ${login}`;

  let api: any;
  try {
    // @ts-ignore — tsconfig.api.json uses moduleResolution:node which can't resolve exports maps; runtime resolves correctly
    const { default: MetaApi } = await import("metaapi.cloud-sdk/node");
    api = new (MetaApi as any)(process.env.METAAPI_TOKEN!);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[broker-connect] MetaApi SDK init failed:", msg);
    return res.status(500).json({ error: "Broker connection service unavailable. Please try again later." });
  }

  let metaApiAccount: any;
  try {
    metaApiAccount = await withRetry(() =>
      api.metatraderAccountApi.createAccount({
        login,
        password,   // accepts investor (read-only) or main password; investor is sufficient for MetaStats
        server,
        platform,
        name: accountName,
        type: "cloud",
        region: "london",
        reliability: "high",
        magic: 0,
      }),
    );
  } catch (err) {
    console.error("[broker-connect] createAccount failed:", err instanceof Error ? err.message : err);
    return res.status(422).json({ error: friendlyMetaApiError(err) });
  }

  // ── 6. Deploy MetaApi account ─────────────────────────────────────────────

  try {
    await withRetry(async () => {
      await metaApiAccount.deploy();
      await metaApiAccount.reload();
    });
  } catch (err) {
    console.error("[broker-connect] deploy failed, cleaning up account", metaApiAccount.id);
    await cleanupMetaApiAccount(metaApiAccount);
    return res.status(422).json({ error: friendlyMetaApiError(err) });
  }

  // ── 7. Persist — both rows must succeed or we undo MetaApi ───────────────
  // Note: enableMetaStatsApi() is NOT called here. The account is still in
  // DEPLOYING state at this point, so calling it would hang. broker-sync.ts
  // enables MetaStats lazily on the first poll once the account is DEPLOYED.

  const isFirst = (existingCount ?? 0) === 0;
  const encryptedPassword = encrypt(password);

  // Step 6a: linked_accounts row
  const { data: linkedAccount, error: linkedAccountError } = await supabase
    .from("linked_accounts")
    .insert({
      user_id: user.id,
      name: accountName,
      broker: server,
      balance: 0,
      currency: "USD",
      is_connected: true,
      is_primary: isFirst,
      last_updated: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (linkedAccountError || !linkedAccount) {
    console.error("[broker-connect] linked_accounts insert failed:", linkedAccountError?.message);
    await cleanupMetaApiAccount(metaApiAccount);
    return res.status(500).json({ error: "Failed to save account. Please try again." });
  }

  // Step 6b: broker_connections row
  const { error: brokerConnError } = await supabase.from("broker_connections").insert({
    user_id: user.id,
    account_id: linkedAccount.id,
    broker_type: "mt4_mt5",
    metaapi_account_id: metaApiAccount.id,
    login,
    server,
    investor_password_encrypted: encryptedPassword,
    connection_status: "connected",
    deploy_state: "DEPLOYED",
    platform,
    region: "london",
    reliability: "high",
    metastats_enabled: false,
    last_deployed_at: new Date().toISOString(),
  });

  if (brokerConnError) {
    console.error("[broker-connect] broker_connections insert failed:", brokerConnError.message);
    await supabase.from("linked_accounts").delete().eq("id", linkedAccount.id);
    await cleanupMetaApiAccount(metaApiAccount);
    return res.status(500).json({ error: "Failed to save connection. Please try again." });
  }

  return res.status(200).json({ success: true, linkedAccountId: linkedAccount.id });
}
