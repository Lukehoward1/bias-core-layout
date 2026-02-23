import { useCallback, useEffect, useMemo, useState } from "react";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";

export type TradeSide = "Long" | "Short";

export interface JournalTrade {
  id: string;
  date: string; // yyyy-mm-dd
  pair: string; // e.g. EURUSD (no slash)
  type: TradeSide;
  entry: number;
  exit: number;
  lots: number;
  pnl: number;
  status: string;
  notes?: string;
  rating?: number;
  accountId?: string;
  source: "manual" | "broker";
}

type CreateManualTradeInput = {
  date: string;
  pair: string;
  type: TradeSide;
  entry: number;
  exit: number;
  lots: number;
  accountId?: string;
};

const STORAGE_KEY = "journalManualTrades_v1";

export function useJournalTrades() {
  const { primaryAccount } = useLinkedAccounts();

  const [manualTrades, setManualTrades] = useState<JournalTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setManualTrades([]);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setManualTrades([]);
        return;
      }

      const cleaned: JournalTrade[] = parsed
        .filter(Boolean)
        .map((t: any) => ({
          id: String(t.id),
          date: String(t.date),
          pair: String(t.pair),
          type: (t.type === "Short" ? "Short" : "Long") as TradeSide,
          entry: Number(t.entry),
          exit: Number(t.exit),
          lots: Number(t.lots),
          pnl: Number(t.pnl),
          status: String(t.status ?? "closed"),
          notes: typeof t.notes === "string" ? t.notes : "",
          rating: typeof t.rating === "number" ? t.rating : 0,
          accountId: typeof t.accountId === "string" ? t.accountId : undefined,
          source: "manual" as const,
        }))
        .filter((t) => Number.isFinite(t.entry) && Number.isFinite(t.exit) && Number.isFinite(t.lots));

      setManualTrades(cleaned);
    } catch {
      setManualTrades([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persistManualTrades = useCallback((next: JournalTrade[]) => {
    setManualTrades(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("journalTradesUpdated"));
  }, []);

  const brokerTrades: JournalTrade[] = useMemo(() => {
    return [];
  }, []);

  const trades = useMemo(() => {
    return [...brokerTrades, ...manualTrades];
  }, [brokerTrades, manualTrades]);

  const createManualTrade = useCallback(
    (input: CreateManualTradeInput) => {
      const entry = Number(input.entry);
      const exit = Number(input.exit);
      const lots = Number(input.lots);

      if (!input.date) return null;
      if (!input.pair) return null;
      if (!Number.isFinite(entry) || !Number.isFinite(exit) || !Number.isFinite(lots) || lots <= 0) return null;

      const pair = input.pair.toUpperCase().replace("/", "");

      const pnl =
        input.type === "Long"
          ? Math.round((exit - entry) * lots * 10000)
          : Math.round((entry - exit) * lots * 10000);

      const resolvedAccountId = input.accountId || primaryAccount?.id || undefined;

      const trade: JournalTrade = {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: input.date,
        pair,
        type: input.type,
        entry,
        exit,
        lots,
        pnl,
        status: "closed",
        notes: "",
        rating: 0,
        accountId: resolvedAccountId,
        source: "manual",
      };

      persistManualTrades([trade, ...manualTrades]);
      return trade;
    },
    [manualTrades, persistManualTrades, primaryAccount?.id],
  );

  const updateManualTrade = useCallback(
    (tradeId: string, patch: Partial<Pick<JournalTrade, "notes" | "rating">>) => {
      const next = manualTrades.map((t) => {
        if (t.id !== tradeId) return t;
        return {
          ...t,
          notes: typeof patch.notes === "string" ? patch.notes : t.notes,
          rating: typeof patch.rating === "number" ? patch.rating : t.rating,
        };
      });
      persistManualTrades(next);
    },
    [manualTrades, persistManualTrades],
  );

  return {
    trades,
    manualTrades,
    brokerTrades,
    isLoading,
    createManualTrade,
    updateManualTrade,
  };
}
