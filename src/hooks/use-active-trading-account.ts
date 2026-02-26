// src/hooks/use-active-trading-account.ts

import { useCallback, useEffect, useState } from "react";

export const ACTIVE_ACCOUNT_ALL = "__all__";

const STORAGE_KEY = "activeTradingAccountId:v1";
const EVENT_NAME = "activeTradingAccountChanged";

function readStored(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim().length > 0 ? v : ACTIVE_ACCOUNT_ALL;
  } catch {
    return ACTIVE_ACCOUNT_ALL;
  }
}

function writeStored(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function useActiveTradingAccount() {
  const [activeAccountId, setActiveAccountIdState] = useState<string>(() => readStored());

  useEffect(() => {
    const sync = () => setActiveAccountIdState(readStored());

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY) sync();
    };
    const onCustom = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, []);

  const setActiveAccountId = useCallback((id: string) => {
    const next = id && id.trim().length > 0 ? id : ACTIVE_ACCOUNT_ALL;
    writeStored(next);
    setActiveAccountIdState(next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return { activeAccountId, setActiveAccountId };
}
