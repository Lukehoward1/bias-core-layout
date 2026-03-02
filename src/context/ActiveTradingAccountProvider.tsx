import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";

export type TradingScopeId = string; // account id
export type TradingScopeValue = TradingScopeId | "all";

type ActiveTradingAccountContextValue = {
  activeAccountId: TradingScopeValue;
  setActiveAccountId: (id: TradingScopeValue) => void;
  // useful helpers
  isAllAccounts: boolean;
};

const ActiveTradingAccountContext = createContext<ActiveTradingAccountContextValue | null>(null);

const STORAGE_KEY = "streambias.activeTradingAccountId";

export function ActiveTradingAccountProvider({ children }: { children: React.ReactNode }) {
  const { accounts, primaryAccount } = useLinkedAccounts();

  const [activeAccountId, setActiveAccountIdState] = useState<TradingScopeValue>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as TradingScopeValue) || "all";
  });

  const setActiveAccountId = (id: TradingScopeValue) => {
    setActiveAccountIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  };

  // If user had an account selected that no longer exists, fall back gracefully
  useEffect(() => {
    if (activeAccountId === "all") return;

    const exists = accounts.some((a) => a.id === activeAccountId);
    if (!exists) {
      // fallback: primary, else all
      setActiveAccountId(primaryAccount?.id || "all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.map((a) => a.id).join("|")]);

  const value = useMemo<ActiveTradingAccountContextValue>(
    () => ({
      activeAccountId,
      setActiveAccountId,
      isAllAccounts: activeAccountId === "all",
    }),
    [activeAccountId],
  );

  return <ActiveTradingAccountContext.Provider value={value}>{children}</ActiveTradingAccountContext.Provider>;
}

export function useActiveTradingAccount() {
  const ctx = useContext(ActiveTradingAccountContext);
  if (!ctx) throw new Error("useActiveTradingAccount must be used within ActiveTradingAccountProvider");
  return ctx;
}
