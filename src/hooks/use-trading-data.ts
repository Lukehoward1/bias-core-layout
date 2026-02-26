// src/hooks/use-trading-data.ts
import { useMemo } from "react";
import { isWithinInterval, parseISO, startOfWeek, startOfMonth, endOfDay } from "date-fns";

import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { useJournalTrades, type Trade } from "@/hooks/use-journal-trades";
import { useActiveTradingAccount, ACTIVE_ACCOUNT_ALL } from "@/hooks/use-active-trading-account";

export type TradingStats = {
  totalTrades: number;
  winRate: number; // 0-100
  totalPnl: number;

  weekPnl: number;
  monthPnl: number;
};

function calcStats(trades: Trade[]): TradingStats {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => (t.pnl || 0) > 0).length;
  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const weekPnl = trades.reduce((s, t) => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start: weekStart, end: endOfDay(now) }) ? s + (t.pnl || 0) : s;
  }, 0);

  const monthPnl = trades.reduce((s, t) => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start: monthStart, end: endOfDay(now) }) ? s + (t.pnl || 0) : s;
  }, 0);

  return { totalTrades, winRate, totalPnl, weekPnl, monthPnl };
}

export function useTradingData() {
  const { accounts, primaryAccount } = useLinkedAccounts();
  const accountIds = useMemo(() => accounts.map((a) => a.id), [accounts]);

  const { activeAccountId, setActiveAccountId } = useActiveTradingAccount();

  // Canonical trade store (manual + synced)
  const journal = useJournalTrades(accountIds);

  const viewTrades = useMemo(() => {
    if (activeAccountId === ACTIVE_ACCOUNT_ALL) return journal.trades;

    // Only trades for the selected account
    return journal.trades.filter((t) => t.accountId === activeAccountId);
  }, [journal.trades, activeAccountId]);

  const activeAccountLabel = useMemo(() => {
    if (activeAccountId === ACTIVE_ACCOUNT_ALL) return "All Accounts";
    const found = accounts.find((a) => a.id === activeAccountId);
    return found?.name ?? "Selected Account";
  }, [activeAccountId, accounts]);

  const stats = useMemo(() => calcStats(viewTrades), [viewTrades]);

  return {
    // account selection
    activeAccountId,
    setActiveAccountId,
    activeAccountLabel,

    // accounts
    accounts,
    primaryAccount,

    // trades
    allTrades: journal.trades,
    viewTrades,

    // stats (based on viewTrades)
    stats,

    // pass-through actions (useful if later cards need them)
    journal,
  };
}
