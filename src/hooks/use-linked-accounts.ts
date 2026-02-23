import { useState, useEffect, useCallback, useMemo } from "react";
import { useSubscription } from "./use-subscription";
import { canLinkMoreAccounts, getRemainingAccountSlots } from "@/types/subscription";

/**
 * Linked accounts are already multi-account.
 * This file now ALSO becomes the canonical per-account trade store (localStorage),
 * so auto-journaling can write trades into the same format the Journal uses.
 */

export interface LinkedAccount {
  id: string;
  name: string;
  broker: string;
  balance: number;
  currency: string;
  isConnected: boolean;
  lastUpdated: Date;
}

/**
 * Canonical trade shape for account-linked trades.
 * This matches the fields your Journal/Reports already expect.
 */
export interface AccountTrade {
  id: string;
  date: string; // yyyy-MM-dd
  pair: string; // symbol e.g. EURUSD, ES, XAUUSD
  type: "Long" | "Short";
  entry: number;
  exit: number;
  lots: number; // lots for FX/CFD, contracts for futures (still stored in this field)
  pnl: number; // GBP P&L (already computed elsewhere; Journal uses it directly)
  status: string; // "closed" etc
  notes?: string;
  rating?: number;
  accountId?: string; // redundant but useful for easy filtering
  source?: "manual" | "broker";
}

export interface LinkAccountResult {
  success: boolean;
  message: string;
  account?: LinkedAccount;
}

interface UseLinkedAccountsReturn {
  accounts: LinkedAccount[];
  primaryAccount: LinkedAccount | null;
  isLoading: boolean;

  accountCount: number;
  maxAccounts: number;
  remainingSlots: number;
  canLinkMore: boolean;
  canLinkAccounts: boolean;

  // Actions
  linkAccount: (accountData: Omit<LinkedAccount, "id" | "lastUpdated">) => LinkAccountResult;
  unlinkAccount: (accountId: string) => void;

  refreshAccount: (accountId: string) => void;
  refreshAllAccounts: () => void;
  setPrimaryAccount: (accountId: string) => void;

  // ✅ NEW: trades API (canonical store for auto-journaling)
  getTradesForAccount: (accountId: string) => AccountTrade[];
  setTradesForAccount: (accountId: string, trades: AccountTrade[]) => void;
  upsertTradesForAccount: (accountId: string, trades: AccountTrade[]) => void;
  clearTradesForAccount: (accountId: string) => void;

  refreshAccountTrades: (accountId: string) => void;
  refreshAllAccountTrades: () => void;
}

const STORAGE_KEY = "linkedTradingAccounts";
const PRIMARY_ACCOUNT_KEY = "primaryTradingAccountId";

// ✅ NEW: per-account trades store
const TRADES_STORAGE_KEY = "linkedAccountTrades"; // maps { [accountId]: AccountTrade[] }

// Legacy compatibility (kept)
const LEGACY_STORAGE_KEY = "linkedTradingAccount";

// Generate unique ID for new accounts
function generateAccountId(): string {
  return `account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safe JSON parse helpers
 */
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeTrades(trades: AccountTrade[], accountId: string): AccountTrade[] {
  return (trades || []).map((t) => ({
    ...t,
    accountId: t.accountId ?? accountId,
  }));
}

function readTradesMap(): Record<string, AccountTrade[]> {
  const parsed = safeParse<Record<string, AccountTrade[]>>(localStorage.getItem(TRADES_STORAGE_KEY), {});
  // Ensure it’s a plain object
  if (!parsed || typeof parsed !== "object") return {};
  return parsed;
}

function writeTradesMap(map: Record<string, AccountTrade[]>) {
  localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event("linkedAccountsUpdated"));
  window.dispatchEvent(new Event("linkedAccountTradesUpdated"));
}

/**
 * Merge trades by id (broker sync is often "upsert").
 * Last write wins for collisions.
 */
function upsertById(existing: AccountTrade[], incoming: AccountTrade[]): AccountTrade[] {
  const map = new Map<string, AccountTrade>();
  existing.forEach((t) => map.set(t.id, t));
  incoming.forEach((t) => map.set(t.id, t));
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Mock broker sync generator (placeholder)
 * In the real integration, this will be replaced by API data from your broker service.
 */
function generateMockBrokerTrades(accountId: string): AccountTrade[] {
  // Small deterministic-ish set per account
  const seed = accountId.length;
  const day = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const base: AccountTrade[] = [
    {
      id: `broker-${accountId}-1`,
      date: day(1 + (seed % 3)),
      pair: "EURUSD",
      type: "Long",
      entry: 1.085,
      exit: 1.089,
      lots: 0.5,
      pnl: 150,
      status: "closed",
      notes: "",
      rating: 0,
      accountId,
      source: "broker",
    },
    {
      id: `broker-${accountId}-2`,
      date: day(2 + (seed % 4)),
      pair: "XAUUSD",
      type: "Short",
      entry: 2040,
      exit: 2034,
      lots: 0.2,
      pnl: 180,
      status: "closed",
      notes: "",
      rating: 0,
      accountId,
      source: "broker",
    },
  ];

  return base;
}

export function useLinkedAccounts(): UseLinkedAccountsReturn {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [primaryAccountId, setPrimaryAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { plan, limits } = useSubscription();

  // Load accounts from localStorage on mount
  useEffect(() => {
    const loadAccounts = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const loadedAccounts = parsed.map((acc: any) => ({
            ...acc,
            lastUpdated: new Date(acc.lastUpdated),
          }));
          setAccounts(loadedAccounts);
        } else {
          setAccounts([]);
        }

        const savedPrimary = localStorage.getItem(PRIMARY_ACCOUNT_KEY);
        if (savedPrimary) {
          setPrimaryAccountId(savedPrimary);
        } else {
          setPrimaryAccountId(null);
        }
      } catch (error) {
        console.error("Failed to load linked accounts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();

    // Listen for storage changes from other tabs/components
    const handleStorageChange = () => loadAccounts();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("linkedAccountsUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("linkedAccountsUpdated", handleStorageChange);
    };
  }, []);

  // Persist accounts to localStorage whenever they change
  const persistAccounts = useCallback((newAccounts: LinkedAccount[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts));
    window.dispatchEvent(new Event("linkedAccountsUpdated"));
  }, []);

  // Calculate derived values
  const accountCount = accounts.length;
  const maxAccounts = limits.maxLinkedAccounts;
  const remainingSlots = getRemainingAccountSlots(plan, accountCount);
  const canLinkMore = canLinkMoreAccounts(plan, accountCount);
  const canLinkAccounts = limits.canLinkAccounts;

  // Get primary account (first connected account if no primary set)
  const primaryAccount = useMemo(() => {
    return (
      accounts.find((a) => a.id === primaryAccountId && a.isConnected) ?? accounts.find((a) => a.isConnected) ?? null
    );
  }, [accounts, primaryAccountId]);

  // ✅ NEW: trades getters/setters
  const getTradesForAccount = useCallback((accountId: string): AccountTrade[] => {
    const map = readTradesMap();
    const list = map[accountId] || [];
    return normalizeTrades(list, accountId);
  }, []);

  const setTradesForAccount = useCallback((accountId: string, trades: AccountTrade[]) => {
    const map = readTradesMap();
    map[accountId] = normalizeTrades(trades || [], accountId);
    writeTradesMap(map);
  }, []);

  const upsertTradesForAccount = useCallback((accountId: string, trades: AccountTrade[]) => {
    const map = readTradesMap();
    const existing = normalizeTrades(map[accountId] || [], accountId);
    const incoming = normalizeTrades(trades || [], accountId);
    map[accountId] = upsertById(existing, incoming);
    writeTradesMap(map);
  }, []);

  const clearTradesForAccount = useCallback((accountId: string) => {
    const map = readTradesMap();
    delete map[accountId];
    writeTradesMap(map);
  }, []);

  // Link a new account with plan-based enforcement
  const linkAccount = useCallback(
    (accountData: Omit<LinkedAccount, "id" | "lastUpdated">): LinkAccountResult => {
      // Check if plan allows account linking
      if (!limits.canLinkAccounts) {
        return {
          success: false,
          message: "Account linking is not available on your current plan.",
        };
      }

      // Check if user is at the limit
      if (!canLinkMoreAccounts(plan, accounts.length)) {
        return {
          success: false,
          message: "You've reached the account limit for your plan.",
        };
      }

      // Create the new account
      const newAccount: LinkedAccount = {
        ...accountData,
        id: generateAccountId(),
        lastUpdated: new Date(),
      };

      const newAccounts = [...accounts, newAccount];
      setAccounts(newAccounts);
      persistAccounts(newAccounts);

      // Set as primary if it's the first account
      if (newAccounts.length === 1) {
        setPrimaryAccountId(newAccount.id);
        localStorage.setItem(PRIMARY_ACCOUNT_KEY, newAccount.id);
      }

      return {
        success: true,
        message: "Account linked successfully.",
        account: newAccount,
      };
    },
    [accounts, plan, limits.canLinkAccounts, persistAccounts],
  );

  // Unlink an account (preserves other accounts)
  const unlinkAccount = useCallback(
    (accountId: string) => {
      const newAccounts = accounts.filter((a) => a.id !== accountId);
      setAccounts(newAccounts);
      persistAccounts(newAccounts);

      // ✅ NEW: also remove stored trades for this account
      clearTradesForAccount(accountId);

      // Update primary if we removed the primary account
      if (primaryAccountId === accountId) {
        const newPrimary = newAccounts.find((a) => a.isConnected)?.id ?? null;
        setPrimaryAccountId(newPrimary);
        if (newPrimary) {
          localStorage.setItem(PRIMARY_ACCOUNT_KEY, newPrimary);
        } else {
          localStorage.removeItem(PRIMARY_ACCOUNT_KEY);
        }
      }
    },
    [accounts, primaryAccountId, persistAccounts, clearTradesForAccount],
  );

  // Refresh a specific account's data
  const refreshAccount = useCallback((accountId: string) => {
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setAccounts((prev) => prev.map((acc) => (acc.id === accountId ? { ...acc, lastUpdated: new Date() } : acc)));
      setIsLoading(false);
    }, 500);
  }, []);

  // Refresh all accounts
  const refreshAllAccounts = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setAccounts((prev) =>
        prev.map((acc) => ({
          ...acc,
          lastUpdated: new Date(),
        })),
      );
      setIsLoading(false);
    }, 500);
  }, []);

  // ✅ NEW: refresh trades for a specific account (simulated broker sync)
  const refreshAccountTrades = useCallback(
    (accountId: string) => {
      setIsLoading(true);

      setTimeout(() => {
        // In the real system: call broker API and upsert trades.
        const brokerTrades = generateMockBrokerTrades(accountId);
        upsertTradesForAccount(accountId, brokerTrades);

        // Also bump account timestamp for "last updated"
        setAccounts((prev) => prev.map((acc) => (acc.id === accountId ? { ...acc, lastUpdated: new Date() } : acc)));

        setIsLoading(false);
      }, 650);
    },
    [upsertTradesForAccount],
  );

  // ✅ NEW: refresh trades for all accounts
  const refreshAllAccountTrades = useCallback(() => {
    setIsLoading(true);

    setTimeout(() => {
      accounts.forEach((acc) => {
        if (!acc.isConnected) return;
        const brokerTrades = generateMockBrokerTrades(acc.id);
        upsertTradesForAccount(acc.id, brokerTrades);
      });

      setAccounts((prev) =>
        prev.map((acc) => ({
          ...acc,
          lastUpdated: new Date(),
        })),
      );

      setIsLoading(false);
    }, 800);
  }, [accounts, upsertTradesForAccount]);

  // Set a specific account as primary
  const setPrimaryAccount = useCallback(
    (accountId: string) => {
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        setPrimaryAccountId(accountId);
        localStorage.setItem(PRIMARY_ACCOUNT_KEY, accountId);
      }
    },
    [accounts],
  );

  return {
    accounts,
    primaryAccount,
    isLoading,
    accountCount,
    maxAccounts,
    remainingSlots,
    canLinkMore,
    canLinkAccounts,

    linkAccount,
    unlinkAccount,
    refreshAccount,
    refreshAllAccounts,
    setPrimaryAccount,

    // ✅ trades API
    getTradesForAccount,
    setTradesForAccount,
    upsertTradesForAccount,
    clearTradesForAccount,
    refreshAccountTrades,
    refreshAllAccountTrades,
  };
}

// ============================================
// Legacy compatibility - maintain old API
// ============================================

export function useLinkedAccount() {
  const { primaryAccount, isLoading, refreshAccount, canLinkAccounts } = useLinkedAccounts();

  return {
    account: primaryAccount,
    isLoading,
    isConnected: primaryAccount?.isConnected ?? false,
    balance: primaryAccount?.isConnected ? primaryAccount.balance : null,
    currency: primaryAccount?.currency ?? "GBP",
    refreshBalance: () => primaryAccount && refreshAccount(primaryAccount.id),
    canLinkAccounts,
  };
}

// Legacy utility - save mock account for testing
export function saveMockLinkedAccount(balance: number, isConnected: boolean = true): void {
  const MOCK_ACCOUNT = {
    id: "demo-account-1",
    name: "Demo Trading Account",
    broker: "Demo Broker",
    balance,
    currency: "GBP",
    isConnected,
    lastUpdated: new Date(),
  };

  // Save to new multi-account system
  const accounts = [MOCK_ACCOUNT];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  localStorage.setItem(PRIMARY_ACCOUNT_KEY, MOCK_ACCOUNT.id);

  // Also save to legacy key for compatibility
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(MOCK_ACCOUNT));

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("linkedAccountsUpdated"));
}

// Clear all linked accounts
export function clearLinkedAccounts(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PRIMARY_ACCOUNT_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);

  // ✅ NEW: clear trades map too
  localStorage.removeItem(TRADES_STORAGE_KEY);

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("linkedAccountsUpdated"));
  window.dispatchEvent(new Event("linkedAccountTradesUpdated"));
}

// Legacy alias
export const clearLinkedAccount = clearLinkedAccounts;
