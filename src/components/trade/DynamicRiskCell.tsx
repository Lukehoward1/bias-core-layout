// src/components/trade/DynamicRiskCell.tsx
// Single-row Dynamic Risk cell for the Trade screen (plan §2.11).
//
// - Filters journal trades to the current context: today's weekday × current
//   session × symbols sharing the same category (e.g. all FX pairs).
// - If ≥ MIN_TRADES in that context, uses the context segment for the figure.
// - Else falls back to the top best/worst insight across all segments (same
//   fallback the DynamicRiskAdvisor compact card uses).
// - If no history at all, shows "Not enough data yet".
// - Reuses computeStats + getRecommendation from DynamicRiskAdvisor — no
//   duplicate maths.
// - Memoised on [symbol, session, baseRisk]; never re-renders on price ticks.

import { useEffect, useMemo, useState } from "react";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useJournalTrades, type Trade } from "@/hooks/use-journal-trades";
import {
  computeStats,
  getRecommendation,
  getSession,
  getDayName,
  MIN_TRADES,
  type SegmentStats,
  type Recommendation,
  type DraSessionName,
} from "@/components/risk/DynamicRiskAdvisor";
import { getInstrument } from "@/data/tradeInstruments";

const RISK_STORAGE_KEY = "globalRiskPreset";

export interface DynamicRiskCellProps {
  symbol: string;
  /** Current trading session (null if no session is open for the pair). */
  session: DraSessionName | null;
  onOpenSlideOver: () => void;
}

function fmtPct(n: number) {
  return n.toFixed(1) + "%";
}

function todayWeekday(): string | null {
  const d = new Date();
  const map: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };
  return map[d.getDay()] ?? null;
}

function findTopInsight(trades: Trade[], baseRisk: number): { label: string; rec: Recommendation } | null {
  const overall = computeStats(trades);
  if (overall.count < MIN_TRADES) return null;

  const SESSIONS: DraSessionName[] = ["Asia", "London", "London-NY Overlap", "New York"];
  const segments: { label: string; stats: SegmentStats }[] = [];
  for (const s of SESSIONS) {
    const bucket = trades.filter((t) => getSession(t.entryTime) === s);
    segments.push({ label: s, stats: computeStats(bucket) });
  }
  const setups = [...new Set(trades.map((t) => t.setup).filter((s): s is string => !!s))];
  for (const setup of setups) {
    const bucket = trades.filter((t) => t.setup === setup);
    segments.push({ label: setup, stats: computeStats(bucket) });
  }
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  for (const d of DAYS) {
    const bucket = trades.filter((t) => getDayName(t.date) === d);
    segments.push({ label: d, stats: computeStats(bucket) });
  }

  const recs = segments
    .map((seg) => ({ label: seg.label, stats: seg.stats, rec: seg.stats.count >= MIN_TRADES ? getRecommendation(seg.stats, overall, baseRisk) : null }))
    .filter((s): s is { label: string; stats: SegmentStats; rec: Recommendation } => s.rec !== null);

  const best = recs.filter((s) => s.rec.direction === "up").sort((a, b) => b.rec.pct - a.rec.pct)[0];
  if (best) return { label: best.label, rec: best.rec };
  const worst = recs.filter((s) => s.rec.direction === "down").sort((a, b) => a.rec.pct - b.rec.pct)[0];
  if (worst) return { label: worst.label, rec: worst.rec };
  return null;
}

export function DynamicRiskCell({ symbol, session, onOpenSlideOver }: DynamicRiskCellProps) {
  const [baseRisk, setBaseRisk] = useState<number>(1);
  const { trades } = useJournalTrades();

  // Load baseRisk preset once; mirrors DynamicRiskAdvisor's behaviour.
  useEffect(() => {
    const raw = localStorage.getItem(RISK_STORAGE_KEY);
    if (raw) {
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n > 0) setBaseRisk(n);
    }
  }, []);

  const weekday = todayWeekday();
  const category = getInstrument(symbol)?.category ?? null;

  // Context-matched trades: today's weekday × current session × same category.
  // Memo keys deliberately include only symbol + session + baseRisk + the trade
  // list itself — never price. The hook already cache-controls the trade list.
  const result = useMemo(() => {
    if (trades.length === 0) {
      return { kind: "empty" as const };
    }

    const overall = computeStats(trades);
    const matchCategory = (t: Trade) => {
      if (!category) return true;
      const inst = getInstrument(t.pair);
      return inst?.category === category;
    };
    const contextTrades = trades
      .filter(matchCategory)
      .filter((t) => (session ? getSession(t.entryTime) === session : true))
      .filter((t) => (weekday ? getDayName(t.date) === weekday : true));

    const contextStats = computeStats(contextTrades);
    if (contextStats.count >= MIN_TRADES) {
      const rec = getRecommendation(contextStats, overall, baseRisk);
      const parts: string[] = [];
      if (category) parts.push(category);
      if (session) parts.push(session);
      if (weekday) parts.push(weekday);
      return {
        kind: "context" as const,
        label: parts.join(" · ") || "This context",
        rec,
        count: contextStats.count,
      };
    }

    const top = findTopInsight(trades, baseRisk);
    if (top) return { kind: "fallback" as const, label: top.label, rec: top.rec };

    return { kind: "empty" as const };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, session, baseRisk, trades]);

  const Icon = result.kind === "empty" ? Brain
    : result.rec.direction === "up" ? TrendingUp
      : result.rec.direction === "down" ? TrendingDown
        : Minus;
  const iconColour = result.kind === "empty" ? "text-muted-foreground"
    : result.rec.direction === "up" ? "text-emerald-500"
      : result.rec.direction === "down" ? "text-destructive"
        : "text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onOpenSlideOver}
      className="w-full rounded-lg border border-border bg-card/40 p-3 text-left hover:bg-card/60 transition"
      aria-label="Open risk tools"
    >
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconColour}`} />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground mb-0.5">Dynamic Risk</div>
          {result.kind === "empty" ? (
            <div className="text-sm font-medium text-foreground">Not enough data yet</div>
          ) : result.kind === "context" ? (
            <div className="text-sm font-medium text-foreground">
              Risk <span className={iconColour}>{fmtPct(result.rec.pct)}</span>
              <span className="text-muted-foreground font-normal"> · {result.label}</span>
            </div>
          ) : (
            <div className="text-sm font-medium text-foreground">
              <span className="font-semibold">{result.label}</span>{" "}
              <span className={iconColour}>{fmtPct(result.rec.pct)}</span>
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Based on your own trading history. Not advice.
          </div>
        </div>
      </div>
    </button>
  );
}
