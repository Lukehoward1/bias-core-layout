import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_TRADES } from "@/data/demoTrades";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const DEMO_OWNER_ID = "a7fda1c9-70eb-40a0-bd66-f80ea1edb27e";

export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  pair: string;
  type: "Long" | "Short";
  entry: number;
  exit: number;
  lots: number;
  pnl: number;
  status: "win" | "loss" | "breakeven";
  notes?: string;
  rating?: number;

  // Actual R multiple: (exit - entry) / (entry - stopLoss) for Long, sign-flipped for Short
  actualR?: number | null;

  stopLoss?: number;
  takeProfit?: number;

  // HH:mm 24-hour UTC — optional, used for session and hold-time analysis
  entryTime?: string;
  exitTime?: string;

  accountId?: string;
  source?: "manual" | "synced";
  setup?: string;
}

type SupabaseTradeRow = {
  id: string;
  user_id: string;
  date: string;
  pair: string;
  type: string;
  entry: number | null;
  exit: number | null;
  lots: number | null;
  pnl: number | null;
  status: string | null;
  notes: string | null;
  rating: number | null;
  actual_r: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  entry_time: string | null;
  exit_time: string | null;
  account_id: string | null;
  source: string | null;
  setup: string | null;
};

function fromRow(row: SupabaseTradeRow): Trade {
  return {
    id: row.id,
    date: row.date,
    pair: row.pair,
    type: row.type as "Long" | "Short",
    entry: row.entry ?? 0,
    exit: row.exit ?? 0,
    lots: row.lots ?? 0,
    pnl: row.pnl ?? 0,
    status: (row.status as "win" | "loss" | "breakeven") ?? "breakeven",
    notes: row.notes ?? undefined,
    rating: row.rating ?? undefined,
    actualR: row.actual_r,
    stopLoss: row.stop_loss ?? undefined,
    takeProfit: row.take_profit ?? undefined,
    entryTime: row.entry_time ?? undefined,
    exitTime: row.exit_time ?? undefined,
    accountId: row.account_id ?? undefined,
    source: (row.source as "manual" | "synced") ?? "manual",
    setup: row.setup ?? undefined,
  };
}

function toRow(t: Trade, userId: string): Omit<SupabaseTradeRow, "id"> {
  return {
    user_id: userId,
    date: t.date,
    pair: t.pair,
    type: t.type,
    entry: t.entry ?? null,
    exit: t.exit ?? null,
    lots: t.lots ?? null,
    pnl: t.pnl ?? null,
    status: t.status ?? null,
    notes: t.notes ?? null,
    rating: t.rating ?? null,
    actual_r: t.actualR ?? null,
    stop_loss: t.stopLoss ?? null,
    take_profit: t.takeProfit ?? null,
    entry_time: t.entryTime ?? null,
    exit_time: t.exitTime ?? null,
    account_id: t.accountId ?? null,
    source: t.source ?? "manual",
    setup: t.setup ?? null,
  };
}

// snake_case subset for partial UPDATE
function patchToRow(patch: Partial<Trade>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.pair !== undefined) row.pair = patch.pair;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.entry !== undefined) row.entry = patch.entry;
  if (patch.exit !== undefined) row.exit = patch.exit;
  if (patch.lots !== undefined) row.lots = patch.lots;
  if (patch.pnl !== undefined) row.pnl = patch.pnl;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.rating !== undefined) row.rating = patch.rating;
  if (patch.actualR !== undefined) row.actual_r = patch.actualR;
  if (patch.stopLoss !== undefined) row.stop_loss = patch.stopLoss;
  if (patch.takeProfit !== undefined) row.take_profit = patch.takeProfit;
  if (patch.entryTime !== undefined) row.entry_time = patch.entryTime;
  if (patch.exitTime !== undefined) row.exit_time = patch.exitTime;
  if (patch.accountId !== undefined) row.account_id = patch.accountId;
  if (patch.source !== undefined) row.source = patch.source;
  if (patch.setup !== undefined) row.setup = patch.setup;
  return row;
}

const SYNCED_TRADES_KEY_PREFIX = "journalSyncedTrades:v1:";

const EVENT_NAME = "journalTradesUpdated";

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

export function useJournalTrades(accountIds: string[] = []) {
  const { user } = useAuth();
  const [manualTrades, setManualTrades] = useState<Trade[]>([]);
  const [syncedTradesByAccount, setSyncedTradesByAccount] = useState<
    Record<string, Trade[]>
  >({});

  const accountIdsKey = accountIds.join("|");

  useEffect(() => {
    let cancelled = false;

    async function fetchManual() {
      if (!user) {
        if (!cancelled) setManualTrades([]);
        return;
      }
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (!error && data && !cancelled) {
        setManualTrades((data as SupabaseTradeRow[]).map(fromRow));
      }
    }

    fetchManual();

    // Synced trades remain in localStorage (no broker integration yet)
    const loaded: Record<string, Trade[]> = {};
    accountIds.forEach((id) => {
      loaded[id] = readSyncedTradesForAccount(id);
    });
    setSyncedTradesByAccount(loaded);

    // Reload when another hook instance mutates trades
    window.addEventListener(EVENT_NAME, fetchManual);

    return () => {
      cancelled = true;
      window.removeEventListener(EVENT_NAME, fetchManual);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, accountIdsKey]);

  const notify = useCallback(() => {
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  const isDemoData = useMemo(() => {
    if (user?.id !== DEMO_OWNER_ID) return false;
    const isVirtualDemoSession =
      accountIds.length === 0 ||
      (accountIds.length === 1 && accountIds[0] === "demo-account");
    const hasRealTrades =
      manualTrades.length > 0 ||
      Object.values(syncedTradesByAccount).flat().length > 0;
    return isVirtualDemoSession && !hasRealTrades;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, accountIdsKey, manualTrades, syncedTradesByAccount]);

  const trades: Trade[] = useMemo(() => {
    const syncedAll = Object.values(syncedTradesByAccount).flat();
    const manual = manualTrades.map((t) => ({ ...t, source: "manual" as const }));
    const synced = syncedAll.map((t) => ({ ...t, source: "synced" as const }));
    const combined = isDemoData
      ? [...DEMO_TRADES, ...manual]
      : [...manual, ...synced];
    combined.sort((a, b) => b.date.localeCompare(a.date));
    return combined;
  }, [manualTrades, syncedTradesByAccount, isDemoData]);

  const addManualTrade = useCallback(
    async (trade: Trade) => {
      if (!user) return;
      // Optimistic: show the trade immediately with its temp id
      setManualTrades((prev) => [trade, ...prev]);

      const { data, error } = await supabase
        .from("trades")
        .insert(toRow(trade, user.id))
        .select()
        .single();

      if (!error && data) {
        // Replace temp trade with the DB-assigned UUID
        const inserted = fromRow(data as SupabaseTradeRow);
        setManualTrades((prev) =>
          prev.map((t) => (t.id === trade.id ? inserted : t)),
        );
      } else if (error) {
        // Rollback on failure
        setManualTrades((prev) => prev.filter((t) => t.id !== trade.id));
      }
      notify();
    },
    [user, notify],
  );

  const updateManualTrade = useCallback(
    async (tradeId: string, patch: Partial<Trade>) => {
      if (!user) return;
      const { error } = await supabase
        .from("trades")
        .update(patchToRow(patch))
        .eq("id", tradeId)
        .eq("user_id", user.id);
      if (!error) {
        setManualTrades((prev) =>
          prev.map((t) => (t.id === tradeId ? { ...t, ...patch } : t)),
        );
        notify();
      }
    },
    [user, notify],
  );

  const deleteManualTrade = useCallback(
    async (tradeId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", tradeId)
        .eq("user_id", user.id);
      if (!error) {
        setManualTrades((prev) => prev.filter((t) => t.id !== tradeId));
        notify();
      }
    },
    [user, notify],
  );

  const setTradeNotes = useCallback(
    async (tradeId: string, notes: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("trades")
        .update({ notes })
        .eq("id", tradeId)
        .eq("user_id", user.id);
      if (!error) {
        setManualTrades((prev) =>
          prev.map((t) => (t.id === tradeId ? { ...t, notes } : t)),
        );
        notify();
      }
    },
    [user, notify],
  );

  const setTradeRating = useCallback(
    async (tradeId: string, rating: number) => {
      if (!user) return;
      const { error } = await supabase
        .from("trades")
        .update({ rating })
        .eq("id", tradeId)
        .eq("user_id", user.id);
      if (!error) {
        setManualTrades((prev) =>
          prev.map((t) => (t.id === tradeId ? { ...t, rating } : t)),
        );
        notify();
      }
    },
    [user, notify],
  );

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
    trades,
    isDemoData,
    manualTrades,
    syncedTradesByAccount,
    addManualTrade,
    updateManualTrade,
    deleteManualTrade,
    setTradeNotes,
    setTradeRating,
    replaceSyncedTrades,
    clearSyncedTrades,
  };
}
