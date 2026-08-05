import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedAccounts } from "./use-linked-accounts";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useBrokerSync() {
  const { session } = useAuth();
  const { accounts } = useLinkedAccounts();
  const isSyncing = useRef(false);

  const syncAll = useCallback(async () => {
    if (isSyncing.current || !session?.access_token) return;
    const connected = accounts.filter((a) => a.isConnected && UUID_RE.test(a.id));
    if (connected.length === 0) return;

    isSyncing.current = true;
    try {
      const results = await Promise.allSettled(
        connected.map(async (a) => {
          const res = await fetch("/api/broker-sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ linkedAccountId: a.id }),
          });
          if (!res.ok) return 0;
          const json = await res.json().catch(() => ({}));
          return json.synced ?? 0;
        }),
      );

      const totalSynced = results.reduce(
        (sum, r) => sum + (r.status === "fulfilled" ? r.value : 0),
        0,
      );
      if (totalSynced > 0) {
        window.dispatchEvent(new Event("journalTradesUpdated"));
      }
    } finally {
      isSyncing.current = false;
    }
  }, [accounts, session?.access_token]);

  useEffect(() => {
    syncAll();
  }, [syncAll]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") syncAll();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", syncAll);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", syncAll);
    };
  }, [syncAll]);

  useEffect(() => {
    const id = setInterval(syncAll, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [syncAll]);
}
