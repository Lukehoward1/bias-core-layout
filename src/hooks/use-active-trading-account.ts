// src/hooks/use-active-trading-account.ts

import { useCallback, useEffect, useState } from "react";

const COMBINE_KEY = "accountCombineMode:v1";
const COMBINE_EVENT = "accountCombineModeChanged";

function readCombineStored(): boolean {
  try { return localStorage.getItem(COMBINE_KEY) === "true"; } catch { return false; }
}
function writeCombineStored(v: boolean) {
  try { localStorage.setItem(COMBINE_KEY, v ? "true" : "false"); } catch {}
}

export function useAccountCombineMode(): [boolean, (v: boolean) => void] {
  const [combineMode, setCombineModeState] = useState<boolean>(() => readCombineStored());

  useEffect(() => {
    const sync = () => setCombineModeState(readCombineStored());
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === COMBINE_KEY) sync(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(COMBINE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(COMBINE_EVENT, sync);
    };
  }, []);

  const setCombineMode = useCallback((v: boolean) => {
    writeCombineStored(v);
    setCombineModeState(v);
    window.dispatchEvent(new Event(COMBINE_EVENT));
  }, []);

  return [combineMode, setCombineMode];
}

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
