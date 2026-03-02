import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";

const STORAGE_KEY = "streambias.activeTradingAccountId";
const ALL = "all" as const;

interface ActiveTradingAccountContextValue {
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  isAllAccounts: boolean;
}

const ActiveTradingAccountContext =
  createContext<ActiveTradingAccountContextValue | null>(null);

function readStored(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim().length > 0 ? v : ALL;
  } catch {
    return ALL;
  }
}

function writeStored(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage unavailable – silently ignore
  }
}

export function ActiveTradingAccountProvider({ children }: { children: ReactNode }) {
  const { accounts, primaryAccount } = useLinkedAccounts();

  const [activeAccountId, setActiveAccountIdState] = useState<string>(readStored);

  // Auto-fallback: if the stored account no longer exists, reset
  useEffect(() => {
    if (activeAccountId === ALL) return;

    const stillExists = accounts.some((a) => a.id === activeAccountId);
    if (!stillExists) {
      const fallback = primaryAccount?.id ?? ALL;
      writeStored(fallback);
      setActiveAccountIdState(fallback);
    }
  }, [activeAccountId, accounts, primaryAccount]);

  const setActiveAccountId = useCallback((id: string) => {
    const next = id && id.trim().length > 0 ? id : ALL;
    writeStored(next);
    setActiveAccountIdState(next);
  }, []);

  const value = useMemo<ActiveTradingAccountContextValue>(
    () => ({
      activeAccountId,
      setActiveAccountId,
      isAllAccounts: activeAccountId === ALL,
    }),
    [activeAccountId, setActiveAccountId],
  );

  return (
    <ActiveTradingAccountContext.Provider value={value}>
      {children}
    </ActiveTradingAccountContext.Provider>
  );
}

export function useActiveTradingAccount(): ActiveTradingAccountContextValue {
  const ctx = useContext(ActiveTradingAccountContext);
  if (!ctx) {
    throw new Error(
      "useActiveTradingAccount must be used within an <ActiveTradingAccountProvider>.",
    );
  }
  return ctx;
}
