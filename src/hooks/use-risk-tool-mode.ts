import { useState, useMemo, useEffect, useCallback } from "react";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import type { LinkedAccount } from "@/hooks/use-linked-accounts";

export type RiskToolMode = "linked" | "manual";

export interface RiskToolModeState {
  mode: RiskToolMode;
  setMode: (m: RiskToolMode) => void;
  /** The account selected for Linked mode (null if none connected) */
  selectedAccount: LinkedAccount | null;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string) => void;
  /** All accounts with isConnected=true */
  connectedAccounts: LinkedAccount[];
  /** All accounts returned by useLinkedAccounts (for useJournalTrades accountIds etc.) */
  accounts: LinkedAccount[];
  /** True when mode=linked AND at least one connected account exists */
  isEffectivelyLinked: boolean;
  hasMultipleAccounts: boolean;
  isLoading: boolean;
}

export function useRiskToolMode(storageKey: string): RiskToolModeState {
  const { accounts, primaryAccount, isLoading } = useLinkedAccounts();

  const connectedAccounts = useMemo(
    () => accounts.filter((a) => a.isConnected),
    [accounts],
  );

  const [mode, setModeState] = useState<RiskToolMode>(() => {
    const saved = localStorage.getItem(`${storageKey}_mode`);
    return saved === "manual" ? "manual" : "linked";
  });

  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(() => {
    return localStorage.getItem(`${storageKey}_account`);
  });

  const setMode = useCallback(
    (m: RiskToolMode) => {
      setModeState(m);
      localStorage.setItem(`${storageKey}_mode`, m);
    },
    [storageKey],
  );

  const setSelectedAccountId = useCallback(
    (id: string) => {
      setSelectedAccountIdState(id);
      localStorage.setItem(`${storageKey}_account`, id);
    },
    [storageKey],
  );

  // When accounts load, ensure selectedAccountId points to a valid connected account.
  useEffect(() => {
    if (isLoading || connectedAccounts.length === 0) return;
    const isValid = selectedAccountId && connectedAccounts.some((a) => a.id === selectedAccountId);
    if (!isValid) {
      const fallback = primaryAccount ?? connectedAccounts[0];
      if (fallback) setSelectedAccountIdState(fallback.id);
    }
  }, [isLoading, connectedAccounts, selectedAccountId, primaryAccount]);

  const selectedAccount = useMemo(() => {
    if (connectedAccounts.length === 0) return null;
    return (
      connectedAccounts.find((a) => a.id === selectedAccountId) ??
      primaryAccount ??
      connectedAccounts[0] ??
      null
    );
  }, [connectedAccounts, selectedAccountId, primaryAccount]);

  const isEffectivelyLinked = mode === "linked" && connectedAccounts.length > 0;

  return {
    mode,
    setMode,
    selectedAccount,
    selectedAccountId: selectedAccount?.id ?? null,
    setSelectedAccountId,
    connectedAccounts,
    accounts,
    isEffectivelyLinked,
    hasMultipleAccounts: connectedAccounts.length > 1,
    isLoading,
  };
}
