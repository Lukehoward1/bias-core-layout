import { useCallback, useEffect, useMemo, useState } from "react";

export type SelectedTradingAccountId = "all" | `account:${string}`;

/**
 * Storage + event keys
 */
const STORAGE_KEY = "selectedTradingAccountId:v1";
const EVENT_NAME = "selectedTradingAccountUpdated";

function safeRead(): SelectedTradingAccountId {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return "all";
  if (raw === "all") return "all";
  if (raw.startsWith("account:")) return raw as SelectedTradingAccountId;
  return "all";
}

function safeWrite(v: SelectedTradingAccountId) {
  localStorage.setItem(STORAGE_KEY, v);
}

/**
 * Global selected-account state for the whole app.
 * - "all" means aggregate
 * - "account:<id>" means focus a specific account
 */
export function useSelectedTradingAccount() {
  const [selectedId, setSelectedIdState] = useState<SelectedTradingAccountId>(() => {
    // If SSR ever happens, guard would be needed — but Lovable/Vite is client-side.
    return safeRead();
  });

  const setSelectedId = useCallback((next: SelectedTradingAccountId) => {
    setSelectedIdState(next);
    safeWrite(next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  // Listen for updates from other tabs/components
  useEffect(() => {
    const onStorage = () => setSelectedIdState(safeRead());
    const onCustom = () => setSelectedIdState(safeRead());

    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, []);

  const selectedAccountId = useMemo(() => {
    if (selectedId === "all") return null;
    return selectedId.replace("account:", "");
  }, [selectedId]);

  return {
    selectedId, // "all" | `account:${string}`
    selectedAccountId, // string | null
    setSelectedId,
    resetToAll: () => setSelectedId("all"),
  };
}
