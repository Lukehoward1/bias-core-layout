import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Canonical trade model used by Journal + Reports.
 * UI must remain identical; this file only changes data storage / merging logic.
 */
export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  pair: string;
  type: "Long" | "Short";
  entry: number;
  exit: number;
  lots: number;
  pnl: number;
  status: string;
  notes?: string;
  rating?: number;

  // Actual R multiple achieved: (exit - entry) / (entry - stopLoss) for Long, sign-flipped for Short
  actualR?: number | null;

  // Which connected account this trade belongs to (undefined => manual/unassigned)
  accountId?: string;

  // Source tracking (used internally; UI doesn't need to show)
  source?: "manual" | "synced";
}

/**
 * Overrides allow user edits (notes, rating) without mutating the broker-synced record.
 * Keyed by tradeId.
 */
type TradeOverride = {
  notes?: string;
  rating?: number;
};

type TradeMap = Record<string, Trade>;
type OverrideMap = Record<string, TradeOverride>;

const MANUAL_TRADES_KEY = "journalManualTrades:v1";
const SYNCED_TRADES_KEY_PREFIX = "journalSyncedTrades:v1:"; // + accountId
const TRADE_OVERRIDES_KEY = "journalTradeOverrides:v1";

/**
 * Broadcast so multiple components/tabs can respond.
 * We keep this consistent with your existing style (linkedAccountsUpdated, etc).
 */
const EVENT_NAME = "journalTradesUpdated";

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readManualTrades(): Trade[] {
  const arr = safeParseJSON<Trade[]>(localStorage.getItem(MANUAL_TRADES_KEY), []);
  return Array.isArray(arr) ? arr : [];
}

function writeManualTrades(trades: Trade[]) {
  localStorage.setItem(MANUAL_TRADES_KEY, JSON.stringify(trades));
}

function readOverrides(): OverrideMap {
  const obj = safeParseJSON<OverrideMap>(localStorage.getItem(TRADE_OVERRIDES_KEY), {});
  return obj && typeof obj === "object" ? obj : {};
}

function writeOverrides(map: OverrideMap) {
  localStorage.setItem(TRADE_OVERRIDES_KEY, JSON.stringify(map));
}

function readSyncedTradesForAccount(accountId: string): Trade[] {
  const key = `${SYNCED_TRADES_KEY_PREFIX}${accountId}`;
  const arr = safeParseJSON<Trade[]>(localStorage.getItem(key), []);
  return Array.isArray(arr) ? arr : [];
}

function writeSyncedTradesForAccount(accountId: string, trades: Trade[]) {
  const key = `${SYNCED_TRADES_KEY_PREFIX}${accountId}`;
  localStorage.setItem(key, JSON.stringify(trades));
}

/**
 * Merge logic:
 * - Manual trades always included.
 * - Synced trades included for all known accountIds you pass in.
 * - Overrides applied on top by trade.id.
 */
function applyOverrides(trades: Trade[], overrides: OverrideMap): Trade[] {
  if (!overrides || Object.keys(overrides).length === 0) return trades;

  return trades.map((t) => {
    const o = overrides[t.id];
    if (!o) return t;
    return {
      ...t,
      ...(typeof o.notes === "string" ? { notes: o.notes } : {}),
      ...(typeof o.rating === "number" ? { rating: o.rating } : {}),
    };
  });
}

/**
 * IMPORTANT: We do not assume broker integration exists yet.
 * This hook gives you a safe place to "drop in" synced trades later,
 * without changing the Journal UI.
 */
export function useJournalTrades(accountIds: string[] = []) {
  const [manualTrades, setManualTrades] = useState<Trade[]>([]);
  const [syncedTradesByAccount, setSyncedTradesByAccount] = useState<Record<string, Trade[]>>({});
  const [overrides, setOverrides] = useState<OverrideMap>({});

  // Load all data on mount + whenever storage events fire
  useEffect(() => {
    const loadAll = () => {
      const loadedManual = readManualTrades();
      const loadedOverrides = readOverrides();

      const loadedSynced: Record<string, Trade[]> = {};
      accountIds.forEach((id) => {
        loadedSynced[id] = readSyncedTradesForAccount(id);
      });

      setManualTrades(loadedManual);
      setOverrides(loadedOverrides);
      setSyncedTradesByAccount(loadedSynced);
    };

    loadAll();

    const onStorage = () => loadAll();
    const onCustom = () => loadAll();

    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, [accountIds.join("|")]);

  const notify = useCallback(() => {
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  // Canonical merged list for the app
  const trades: Trade[] = useMemo(() => {
    const syncedAll = Object.values(syncedTradesByAccount).flat();

    // Ensure sources are set (internal convenience)
    const manual = manualTrades.map((t) => ({ ...t, source: "manual" as const }));
    const synced = syncedAll.map((t) => ({ ...t, source: "synced" as const }));

    // Combine
    const combined = [...manual, ...synced];

    // Apply overrides
    const withOverrides = applyOverrides(combined, overrides);

    // Default sort: newest date first (same behavior you’ve been using elsewhere)
    withOverrides.sort((a, b) => b.date.localeCompare(a.date));

    return withOverrides;
  }, [manualTrades, syncedTradesByAccount, overrides]);

  /**
   * Manual trade actions (writes to localStorage)
   */
  const addManualTrade = useCallback(
    (trade: Trade) => {
      const next = [trade, ...manualTrades];
      setManualTrades(next);
      writeManualTrades(next);
      notify();
    },
    [manualTrades, notify],
  );

  const updateManualTrade = useCallback(
    (tradeId: string, patch: Partial<Trade>) => {
      const next = manualTrades.map((t) => (t.id === tradeId ? { ...t, ...patch } : t));
      setManualTrades(next);
      writeManualTrades(next);
      notify();
    },
    [manualTrades, notify],
  );

  const deleteManualTrade = useCallback(
    (tradeId: string) => {
      const next = manualTrades.filter((t) => t.id !== tradeId);
      setManualTrades(next);
      writeManualTrades(next);
      // also remove overrides if any
      const o = { ...overrides };
      if (o[tradeId]) {
        delete o[tradeId];
        setOverrides(o);
        writeOverrides(o);
      }
      notify();
    },
    [manualTrades, overrides, notify],
  );

  /**
   * Overrides (notes/rating) — used for BOTH manual and synced trades.
   * For manual trades you *could* store inline, but keeping consistent simplifies logic.
   */
  const setTradeNotes = useCallback(
    (tradeId: string, notes: string) => {
      const next = { ...overrides, [tradeId]: { ...(overrides[tradeId] ?? {}), notes } };
      setOverrides(next);
      writeOverrides(next);
      notify();
    },
    [overrides, notify],
  );

  const setTradeRating = useCallback(
    (tradeId: string, rating: number) => {
      const next = { ...overrides, [tradeId]: { ...(overrides[tradeId] ?? {}), rating } };
      setOverrides(next);
      writeOverrides(next);
      notify();
    },
    [overrides, notify],
  );

  /**
   * Synced trade actions (for broker integrations)
   * This is where your Pepperstone/MT5/MT4 integration will write into,
   * per accountId.
   *
   * For now: you can simulate synced trades by calling replaceSyncedTrades().
   */
  const replaceSyncedTrades = useCallback(
    (accountId: string, newTrades: Trade[]) => {
      const normalized = newTrades.map((t) => ({
        ...t,
        accountId: t.accountId ?? accountId,
        source: "synced" as const,
      }));

      setSyncedTradesByAccount((prev) => ({ ...prev, [accountId]: normalized }));
      writeSyncedTradesForAccount(accountId, normalized);
      notify();
    },
    [notify],
  );

  const clearSyncedTrades = useCallback(
    (accountId: string) => {
      setSyncedTradesByAccount((prev) => ({ ...prev, [accountId]: [] }));
      writeSyncedTradesForAccount(accountId, []);
      notify();
    },
    [notify],
  );

  return {
    // Canonical merged list
    trades,

    // Manual-only list (rarely needed, but useful)
    manualTrades,

    // Synced per account (useful later)
    syncedTradesByAccount,

    // Actions
    addManualTrade,
    updateManualTrade,
    deleteManualTrade,
    setTradeNotes,
    setTradeRating,

    // Broker integration entry points
    replaceSyncedTrades,
    clearSyncedTrades,
  };
}
