const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
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

// Undeploys all MetaApi broker connections beyond maxAllowed for a user.
// Ordering: primary account (is_primary=true on linked_accounts) is kept first,
// then oldest by created_at. Pass maxAllowed=0 to undeploy everything.
export async function undeployExcessBrokerConnections(
  supabase: any,
  userId: string,
  maxAllowed: number,
): Promise<void> {
  // Get linked accounts ordered: primary first, then oldest
  const { data: linkedAccounts, error: laError } = await supabase
    .from("linked_accounts")
    .select("id")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (laError || !linkedAccounts?.length) return;

  const accountIds = (linkedAccounts as { id: string }[]).map((a) => a.id);

  const { data: connections, error } = await supabase
    .from("broker_connections")
    .select("id, metaapi_account_id, deploy_state, account_id")
    .eq("user_id", userId)
    .not("metaapi_account_id", "is", null)
    .in("account_id", accountIds);

  if (error) {
    console.error(`[undeploy] failed to fetch broker_connections for ${userId}:`, error.message);
    return;
  }
  if (!connections?.length) return;

  // Re-sort connections to match linked_accounts order (primary first, then oldest)
  const positionOf = (accountId: string) => {
    const idx = accountIds.indexOf(accountId);
    return idx === -1 ? accountIds.length : idx;
  };
  const sorted = [...connections].sort(
    (a, b) => positionOf(a.account_id) - positionOf(b.account_id),
  );

  const toUndeploy = sorted.slice(maxAllowed).filter((c) => c.deploy_state !== "UNDEPLOYED");
  if (!toUndeploy.length) return;

  try {
    // @ts-ignore — tsconfig.api.json uses moduleResolution:node which can't resolve exports maps
    const { default: MetaApi } = await import("metaapi.cloud-sdk/node");
    const api = new (MetaApi as any)(process.env.METAAPI_TOKEN!);

    for (const conn of toUndeploy) {
      try {
        await withRetry(async () => {
          const account = await api.metatraderAccountApi.getAccount(conn.metaapi_account_id);
          if (account.state !== "UNDEPLOYED") await account.undeploy();
          await account.reload();
        });
        await supabase
          .from("broker_connections")
          .update({
            deploy_state: "UNDEPLOYED",
            connection_status: "disconnected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id);
        console.log(`[undeploy] undeployed connection ${conn.id} for user ${userId}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[undeploy] failed to undeploy ${conn.id} after 3 attempts:`, msg);
      }
    }
  } catch (initErr: unknown) {
    const msg = initErr instanceof Error ? initErr.message : String(initErr);
    console.error(`[undeploy] MetaApi init failed for user ${userId} — skipping undeploy, orphan-detect will catch:`, msg);
  }
}
