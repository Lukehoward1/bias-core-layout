// src/hooks/use-account-aware-stats.ts
//
// Computes per-account and (when safe) combined stats and equity curves from
// a flat array of trades and the corresponding LinkedAccount list.
//
// Currency-safety guarantee
// ─────────────────────────
// `combined` is ONLY populated when every account in `accounts` shares the
// same `currency`. When currencies differ, `combined` is null and `canCombine`
// is false. This prevents the blended-currency bug currently present in
// LiveEquityCard, which anchors absolute equity to primaryAccount.balance
// regardless of whether trades from other currencies are included in the total.

import { useMemo } from "react";
import {
  parseISO,
  isWithinInterval,
  startOfWeek,
  startOfMonth,
  endOfDay,
  format,
} from "date-fns";
import type { Trade } from "@/hooks/use-journal-trades";
import type { LinkedAccount } from "@/hooks/use-linked-accounts";

// ── Public types ──────────────────────────────────────────────────────────────

/** Superset of all stat fields used across Journal, Reports, and Dashboard. */
export interface AccountStats {
  totalTrades: number;
  /** Integer 0–100. */
  winRate: number;
  totalPnl: number;
  weekPnl: number;
  monthPnl: number;
  /** Average actual R-multiple across trades where actualR is defined; excludes trades without a stop-loss set. */
  avgRR: number;
  /** "0.00" | "∞" | decimal string — matches existing Journal/Reports rendering. */
  profitFactor: string;
  expectancy: number;
  maxConsecWins: number;
  maxConsecLosses: number;
  avgWinner: number;
  avgLoser: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
}

export interface EquityPoint {
  date: string;
  equity: number;
  formattedDate: string;
  /** Only present on relative curve points. */
  tradeCount?: number;
}

export interface AccountEntry {
  account: LinkedAccount;
  stats: AccountStats;
  /**
   * Cumulative P&L from zero, aggregated per calendar day.
   * Matches Journal's EquityCurveCard logic.
   */
  equityCurveRelative: EquityPoint[];
  /**
   * Absolute account balance per trade, starting from
   * `account.balance - stats.totalPnl`. Always denominated in
   * `account.currency` — currency-safe by construction when used
   * per-account rather than blended.
   * Matches LiveEquityCard logic, scoped to a single account.
   */
  equityCurveAbsolute: EquityPoint[];
}

export interface UseAccountAwareStatsResult {
  /** Per-account stats and curves, keyed by account id. */
  perAccount: Map<string, AccountEntry>;
  /**
   * True only when every account in `accounts` shares the same `currency`.
   * Only when this is true is `combined` non-null.
   */
  canCombine: boolean;
  /**
   * Combined stats and equity curves across all accounts and all supplied
   * trades. `null` when `canCombine` is false.
   *
   * Currency-safety guarantee: this field is deliberately withheld when
   * accounts span multiple currencies. Never silently sum mismatched
   * currencies — callers must gate on `canCombine` before using this value.
   */
  combined: AccountEntry | null;
}

// ── Pure computation helpers ──────────────────────────────────────────────────

function computeStats(trades: Trade[]): AccountStats {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = trades.filter((t) => (t.pnl ?? 0) < 0);

  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const dayEnd = endOfDay(now);

  const weekPnl = trades.reduce((s, t) => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start: weekStart, end: dayEnd }) ? s + (t.pnl ?? 0) : s;
  }, 0);

  const monthPnl = trades.reduce((s, t) => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start: monthStart, end: dayEnd }) ? s + (t.pnl ?? 0) : s;
  }, 0);

  const posSum = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const negSum = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const avgWin = wins.length > 0 ? posSum / wins.length : 0;
  const rTrades = trades.filter((t) => t.actualR != null);
  const avgRR =
    rTrades.length > 0
      ? rTrades.reduce((s, t) => s + (t.actualR ?? 0), 0) / rTrades.length
      : 0;
  const profitFactor =
    posSum === 0 ? "0.00" : negSum === 0 ? "∞" : (posSum / negSum).toFixed(2);
  const expectancy =
    (winRate / 100) * avgWin - ((100 - winRate) / 100) * (losses.length > 0 ? negSum / losses.length : 0);
  const avgWinner = wins.length > 0 ? posSum / wins.length : 0;
  const avgLoser = losses.length > 0 ? negSum / losses.length : 0;

  // Best / worst day
  const dailyPnl = trades.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] ?? 0) + (t.pnl ?? 0);
    return acc;
  }, {} as Record<string, number>);
  const dailyEntries = Object.entries(dailyPnl);
  const bestDay =
    dailyEntries.length > 0
      ? dailyEntries.reduce<{ date: string; pnl: number } | null>(
          (best, [date, pnl]) => (pnl > (best?.pnl ?? -Infinity) ? { date, pnl } : best),
          null,
        )
      : null;
  const worstDay =
    dailyEntries.length > 0
      ? dailyEntries.reduce<{ date: string; pnl: number } | null>(
          (worst, [date, pnl]) => (pnl < (worst?.pnl ?? Infinity) ? { date, pnl } : worst),
          null,
        )
      : null;

  // Consecutive win/loss streaks
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let maxConsecWins = 0, maxConsecLosses = 0, curW = 0, curL = 0;
  for (const t of sorted) {
    if ((t.pnl ?? 0) > 0) {
      curW++; maxConsecWins = Math.max(maxConsecWins, curW); curL = 0;
    } else if ((t.pnl ?? 0) < 0) {
      curL++; maxConsecLosses = Math.max(maxConsecLosses, curL); curW = 0;
    } else {
      curW = 0; curL = 0;
    }
  }

  return {
    totalTrades, winRate, totalPnl, weekPnl, monthPnl,
    avgRR, profitFactor, expectancy,
    maxConsecWins, maxConsecLosses,
    avgWinner, avgLoser,
    bestDay, worstDay,
  };
}

/** Cumulative P&L from zero, day-aggregated. Matches Journal EquityCurveCard. */
function computeEquityCurveRelative(trades: Trade[]): EquityPoint[] {
  const daily = trades.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] ?? 0) + (t.pnl ?? 0);
    return acc;
  }, {} as Record<string, number>);

  const days = Object.keys(daily).sort((a, b) => a.localeCompare(b));
  let cumulative = 0;
  let tradeCount = 0;
  return days.map((date) => {
    cumulative += daily[date];
    tradeCount += trades.filter((t) => t.date === date).length;
    return {
      date,
      equity: cumulative,
      formattedDate: format(parseISO(date), "MMM d"),
      tradeCount,
    };
  });
}

/**
 * Absolute balance per trade, starting from `startingBalance`.
 * Matches LiveEquityCard logic; callers pass `account.balance - stats.totalPnl`
 * as `startingBalance` so the curve ends at the current account balance.
 */
function computeEquityCurveAbsolute(trades: Trade[], startingBalance: number): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let running = startingBalance;
  return sorted.map((t) => {
    running += t.pnl ?? 0;
    return {
      date: t.date,
      equity: Math.round(running),
      formattedDate: t.date.slice(5).replace("-", "/"),
    };
  });
}

function buildEntry(account: LinkedAccount, trades: Trade[]): AccountEntry {
  const stats = computeStats(trades);
  return {
    account,
    stats,
    equityCurveRelative: computeEquityCurveRelative(trades),
    equityCurveAbsolute: computeEquityCurveAbsolute(trades, account.balance - stats.totalPnl),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Computes per-account and (when safe) combined trading stats and equity curves.
 *
 * @param trades - All trades to consider, typically from useJournalTrades.
 * @param accounts - The accounts the trades belong to, from useLinkedAccounts.
 *
 * @returns `perAccount` keyed by account id, `canCombine` boolean, and
 *   `combined` — which is null when accounts span multiple currencies.
 */
export function useAccountAwareStats(
  trades: Trade[],
  accounts: LinkedAccount[],
): UseAccountAwareStatsResult {
  return useMemo(() => {
    const perAccount = new Map<string, AccountEntry>();

    for (const account of accounts) {
      const accountTrades = trades.filter((t) => t.accountId === account.id);
      perAccount.set(account.id, buildEntry(account, accountTrades));
    }

    const currencies = new Set(accounts.map((a) => a.currency));
    const canCombine = accounts.length > 0 && currencies.size === 1;

    let combined: AccountEntry | null = null;
    if (canCombine) {
      const currency = accounts[0]!.currency;
      const combinedBalance = accounts.reduce((s, a) => s + a.balance, 0);
      const syntheticAccount: LinkedAccount = {
        id: "__combined__",
        name: "All Accounts",
        broker: "",
        balance: combinedBalance,
        currency,
        isConnected: true,
        lastUpdated: new Date(),
      };
      combined = buildEntry(syntheticAccount, trades);
    }

    return { perAccount, canCombine, combined };
  }, [trades, accounts]);
}
