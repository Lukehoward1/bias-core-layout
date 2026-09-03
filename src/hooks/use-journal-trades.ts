import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DEMO_TRADES } from "@/data/demoTrades";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const DEMO_OWNER_ID = "bf56f6fc-99ab-4870-aba4-58fc18790011";

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
  confluence?: string[];
  tags?: string[];
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
  confluence: string[] | null;
  tags: string[] | null;
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
    confluence: row.confluence ?? [],
    tags: row.tags ?? [],
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
    confluence: t.confluence ?? [],
    tags: t.tags ?? [],
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
  if (patch.setup !== undefined) row.setup = patch.setup || null;
  if (patch.confluence !== undefined) row.confluence = patch.confluence ?? [];
  if (patch.tags !== undefined) row.tags = patch.tags ?? [];
  return row;
}

const EVENT_NAME = "journalTradesUpdated";

export function useJournalTrades(_accountIds: string[] = []) {
  const { user } = useAuth();
  const [manualTrades, setManualTrades] = useState<Trade[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchManual() {
      if (!user) {
        if (!cancelled) {
          setManualTrades([]);
          setIsLoaded(true);
        }
        return;
      }
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (!cancelled) {
        if (!error && data) {
          setManualTrades((data as SupabaseTradeRow[]).map(fromRow));
        } else if (error) {
          toast.error("Couldn't load your trades — try refreshing the page.");
        }
        setIsLoaded(true);
      }
    }

    setIsLoaded(false);
    fetchManual();

    window.addEventListener(EVENT_NAME, fetchManual);

    return () => {
      cancelled = true;
      window.removeEventListener(EVENT_NAME, fetchManual);
    };
  }, [user?.id]);

  // One-time seed: insert demo trades for the demo account if the table is empty
  useEffect(() => {
    if (!isLoaded || !user || user.id !== DEMO_OWNER_ID || manualTrades.length > 0) return;

    async function seedDemoTrades() {
      const rows = DEMO_TRADES.map((t) => toRow(t, DEMO_OWNER_ID));
      const { data, error } = await supabase
        .from("trades")
        .insert(rows)
        .select();
      if (!error && data) {
        setManualTrades((data as SupabaseTradeRow[]).map(fromRow));
      }
    }

    seedDemoTrades();
  }, [isLoaded, user?.id, manualTrades.length]);

  const notify = useCallback(() => {
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  const isDemoData = false;

  const trades: Trade[] = useMemo(() => {
    const sorted = [...manualTrades];
    sorted.sort((a, b) => b.date.localeCompare(a.date));
    return sorted;
  }, [manualTrades]);

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
        toast.error("Couldn't save that trade — please try again.");
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
      } else {
        toast.error("Couldn't update that trade — please try again.");
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
      } else {
        toast.error("Couldn't delete that trade — please try again.");
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
      } else {
        toast.error("Couldn't save your notes — please try again.");
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
      } else {
        toast.error("Couldn't save your rating — please try again.");
      }
    },
    [user, notify],
  );

  // Deprecated stubs — broker-sync now writes directly to Supabase
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const replaceSyncedTrades = useCallback((_accountId: string, _newTrades: Trade[]) => {}, []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearSyncedTrades = useCallback((_accountId: string) => {}, []);

  return {
    trades,
    isDemoData,
    manualTrades,
    addManualTrade,
    updateManualTrade,
    deleteManualTrade,
    setTradeNotes,
    setTradeRating,
    replaceSyncedTrades,
    clearSyncedTrades,
  };
}
