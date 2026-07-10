import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useSubscription } from "./use-subscription";
import { canLinkMoreAccounts, getRemainingAccountSlots } from "@/types/subscription";
import { DEMO_BROKER_ACCOUNT } from "@/data/demoBrokerAccount";

/**
 * Linked accounts are persisted in Supabase (linked_accounts table).
 * The exported interface is identical to the previous localStorage version
 * so all consuming components remain unchanged.
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
  linkAccount: (accountData: Omit<LinkedAccount, "id" | "lastUpdated">) => Promise<LinkAccountResult>;
  unlinkAccount: (accountId: string) => Promise<void>;

  refreshAccount: (accountId: string) => void;
  refreshAllAccounts: () => void;
  setPrimaryAccount: (accountId: string) => Promise<void>;

  // Legacy trades API (dead code — localStorage-based, kept for interface compatibility)
  getTradesForAccount: (accountId: string) => AccountTrade[];
  setTradesForAccount: (accountId: string, trades: AccountTrade[]) => void;
  upsertTradesForAccount: (accountId: string, trades: AccountTrade[]) => void;
  clearTradesForAccount: (accountId: string) => void;

  refreshAccountTrades: (accountId: string) => void;
  refreshAllAccountTrades: () => void;
}

// ── Supabase row shape ────────────────────────────────────────────────────────

interface LinkedAccountRow {
  id: string;
  user_id: string;
  name: string;
  broker: string;
  balance: number;
  currency: string;
  is_connected: boolean;
  is_primary: boolean;
  last_updated: string;
  created_at: string;
}

function rowToAccount(row: LinkedAccountRow): LinkedAccount {
  return {
    id: row.id,
    name: row.name,
    broker: row.broker,
    balance: row.balance,
    currency: row.currency,
    isConnected: row.is_connected,
    lastUpdated: new Date(row.last_updated),
  };
}

// ── Legacy localStorage trades API (unchanged — dead code kept for compat) ────

const TRADES_STORAGE_KEY = "linkedAccountTrades";

function readTradesMap(): Record<string, AccountTrade[]> {
  try {
    const raw = localStorage.getItem(TRADES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, AccountTrade[]>;
  } catch {
    return {};
  }
}

function writeTradesMap(map: Record<string, AccountTrade[]>) {
  localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event("linkedAccountsUpdated"));
  window.dispatchEvent(new Event("linkedAccountTradesUpdated"));
}

function normalizeTrades(trades: AccountTrade[], accountId: string): AccountTrade[] {
  return (trades || []).map((t) => ({ ...t, accountId: t.accountId ?? accountId }));
}

function upsertById(existing: AccountTrade[], incoming: AccountTrade[]): AccountTrade[] {
  const map = new Map<string, AccountTrade>();
  existing.forEach((t) => map.set(t.id, t));
  incoming.forEach((t) => map.set(t.id, t));
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function generateMockBrokerTrades(accountId: string): AccountTrade[] {
  const seed = accountId.length;
  const day = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  return [
    { id: `broker-${accountId}-1`, date: day(1 + (seed % 3)), pair: "EURUSD", type: "Long", entry: 1.085, exit: 1.089, lots: 0.5, pnl: 150, status: "closed", notes: "", rating: 0, accountId, source: "broker" },
    { id: `broker-${accountId}-2`, date: day(2 + (seed % 4)), pair: "XAUUSD", type: "Short", entry: 2040, exit: 2034, lots: 0.2, pnl: 180, status: "closed", notes: "", rating: 0, accountId, source: "broker" },
  ];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const DEMO_OWNER_ID = "bf56f6fc-99ab-4870-aba4-58fc18790011";

export function useLinkedAccounts(): UseLinkedAccountsReturn {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [primaryAccountId, setPrimaryAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { plan, limits } = useSubscription();

  // ── Load from Supabase on mount / user change ───────────────────────────────

  const loadAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setPrimaryAccountId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("linked_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[useLinkedAccounts] Failed to load accounts:", error.message);
      setAccounts([]);
      setPrimaryAccountId(null);
    } else {
      const rows = (data ?? []) as LinkedAccountRow[];
      setAccounts(rows.map(rowToAccount));
      const primary = rows.find((r) => r.is_primary);
      setPrimaryAccountId(primary?.id ?? null);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const accountCount = accounts.length;
  const maxAccounts = limits.maxLinkedAccounts;
  const remainingSlots = getRemainingAccountSlots(plan, accountCount);
  const canLinkMore = canLinkMoreAccounts(plan, accountCount);
  const canLinkAccounts = limits.canLinkAccounts;

  // Demo fallback: show DEMO_BROKER_ACCOUNT when no real rows exist,
  // EXCEPT for the demo owner who always has a real linked_accounts row.
  const effectiveAccounts = useMemo(() => {
    if (accounts.length === 0 && user?.id !== DEMO_OWNER_ID) {
      return [DEMO_BROKER_ACCOUNT];
    }
    return accounts;
  }, [accounts, user?.id]);

  const primaryAccount = useMemo(() => {
    return (
      effectiveAccounts.find((a) => a.id === primaryAccountId && a.isConnected) ??
      effectiveAccounts.find((a) => a.isConnected) ??
      null
    );
  }, [effectiveAccounts, primaryAccountId]);

  // ── linkAccount ─────────────────────────────────────────────────────────────

  const linkAccount = useCallback(
    async (accountData: Omit<LinkedAccount, "id" | "lastUpdated">): Promise<LinkAccountResult> => {
      if (!user) return { success: false, message: "Not authenticated." };

      if (!limits.canLinkAccounts) {
        return { success: false, message: "Account linking is not available on your current plan." };
      }
      if (!canLinkMoreAccounts(plan, accounts.length)) {
        return { success: false, message: "You've reached the account limit for your plan." };
      }

      const isFirst = accounts.length === 0;

      const { data, error } = await supabase
        .from("linked_accounts")
        .insert({
          user_id: user.id,
          name: accountData.name,
          broker: accountData.broker,
          balance: accountData.balance,
          currency: accountData.currency,
          is_connected: accountData.isConnected,
          is_primary: isFirst,
          last_updated: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("[useLinkedAccounts] linkAccount failed:", error.message);
        return { success: false, message: "Failed to link account. Please try again." };
      }

      const newAccount = rowToAccount(data as LinkedAccountRow);
      setAccounts((prev) => [...prev, newAccount]);
      if (isFirst) setPrimaryAccountId(newAccount.id);

      return { success: true, message: "Account linked successfully.", account: newAccount };
    },
    [user, accounts.length, plan, limits.canLinkAccounts],
  );

  // ── unlinkAccount ───────────────────────────────────────────────────────────

  const unlinkAccount = useCallback(
    async (accountId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from("linked_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[useLinkedAccounts] unlinkAccount failed:", error.message);
        return;
      }

      // Also clear stored trades for this account (legacy localStorage system)
      const map = readTradesMap();
      delete map[accountId];
      writeTradesMap(map);

      const remaining = accounts.filter((a) => a.id !== accountId);
      setAccounts(remaining);

      // If we removed the primary, promote the next connected account
      if (primaryAccountId === accountId) {
        const next = remaining.find((a) => a.isConnected) ?? null;
        if (next) {
          await supabase
            .from("linked_accounts")
            .update({ is_primary: true })
            .eq("id", next.id)
            .eq("user_id", user.id);
        }
        setPrimaryAccountId(next?.id ?? null);
      }
    },
    [user, accounts, primaryAccountId],
  );

  // ── refreshAccount / refreshAllAccounts (stubs — no real broker sync yet) ──

  const refreshAccount = useCallback(
    (accountId: string) => {
      setIsLoading(true);
      setTimeout(async () => {
        const now = new Date().toISOString();
        await supabase
          .from("linked_accounts")
          .update({ last_updated: now })
          .eq("id", accountId)
          .eq("user_id", user?.id ?? "");

        setAccounts((prev) =>
          prev.map((a) => (a.id === accountId ? { ...a, lastUpdated: new Date(now) } : a)),
        );
        setIsLoading(false);
      }, 500);
    },
    [user],
  );

  const refreshAllAccounts = useCallback(() => {
    setIsLoading(true);
    setTimeout(async () => {
      const now = new Date().toISOString();
      if (user) {
        await supabase
          .from("linked_accounts")
          .update({ last_updated: now })
          .eq("user_id", user.id);
      }
      setAccounts((prev) => prev.map((a) => ({ ...a, lastUpdated: new Date(now) })));
      setIsLoading(false);
    }, 500);
  }, [user]);

  // ── setPrimaryAccount ───────────────────────────────────────────────────────
  // Clear-first to avoid violating the partial unique index (one is_primary=true per user).

  const setPrimaryAccount = useCallback(
    async (accountId: string) => {
      if (!user) return;
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return;

      // Step 1: clear all primaries for this user
      await supabase
        .from("linked_accounts")
        .update({ is_primary: false })
        .eq("user_id", user.id);

      // Step 2: set the new primary
      await supabase
        .from("linked_accounts")
        .update({ is_primary: true })
        .eq("id", accountId)
        .eq("user_id", user.id);

      setPrimaryAccountId(accountId);
    },
    [user, accounts],
  );

  // ── Legacy trades API (localStorage, dead code, kept for interface compat) ──

  const getTradesForAccount = useCallback((accountId: string): AccountTrade[] => {
    const map = readTradesMap();
    return normalizeTrades(map[accountId] || [], accountId);
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

  const refreshAccountTrades = useCallback(
    (accountId: string) => {
      setIsLoading(true);
      setTimeout(() => {
        const brokerTrades = generateMockBrokerTrades(accountId);
        upsertTradesForAccount(accountId, brokerTrades);
        setAccounts((prev) =>
          prev.map((a) => (a.id === accountId ? { ...a, lastUpdated: new Date() } : a)),
        );
        setIsLoading(false);
      }, 650);
    },
    [upsertTradesForAccount],
  );

  const refreshAllAccountTrades = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      accounts.forEach((acc) => {
        if (!acc.isConnected) return;
        upsertTradesForAccount(acc.id, generateMockBrokerTrades(acc.id));
      });
      setAccounts((prev) => prev.map((a) => ({ ...a, lastUpdated: new Date() })));
      setIsLoading(false);
    }, 800);
  }, [accounts, upsertTradesForAccount]);

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    accounts: effectiveAccounts,
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

  // Save to legacy localStorage keys for compatibility
  const STORAGE_KEY = "linkedTradingAccounts";
  const PRIMARY_ACCOUNT_KEY = "primaryTradingAccountId";
  const LEGACY_STORAGE_KEY = "linkedTradingAccount";

  localStorage.setItem(STORAGE_KEY, JSON.stringify([MOCK_ACCOUNT]));
  localStorage.setItem(PRIMARY_ACCOUNT_KEY, MOCK_ACCOUNT.id);
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(MOCK_ACCOUNT));

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("linkedAccountsUpdated"));
}

// Clear all linked accounts (legacy localStorage cleanup only)
export function clearLinkedAccounts(): void {
  const STORAGE_KEY = "linkedTradingAccounts";
  const PRIMARY_ACCOUNT_KEY = "primaryTradingAccountId";
  const LEGACY_STORAGE_KEY = "linkedTradingAccount";

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PRIMARY_ACCOUNT_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(TRADES_STORAGE_KEY);

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("linkedAccountsUpdated"));
  window.dispatchEvent(new Event("linkedAccountTradesUpdated"));
}

// Legacy alias
export const clearLinkedAccount = clearLinkedAccounts;
