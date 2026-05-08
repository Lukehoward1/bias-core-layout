// src/services/contextEngine.ts
// ─────────────────────────────────────────────────────────────
// StreamBias Context Engine v1
//
// Pure logic layer that converts existing asset metadata, market
// quotes and calendar events into explainable, NEUTRAL trading
// context (no signals, no entries, no SL/TP).
//
// Designed so real OHLC candle history can be plugged in later
// without touching consumer UI: replace the deterministic mock
// generators inside `buildLevels` / `deriveStructureState` while
// keeping the exported public API stable.
// ─────────────────────────────────────────────────────────────

import type { Asset } from "@/data/assets";
import type { MarketQuote } from "@/services/marketData";
import type { CalendarEvent } from "@/data/calendarEvents";
import type { TraderStyle } from "@/context/TraderStyleProvider";

// ── Public types ─────────────────────────────────────────────

export type BiasState =
  | "Bullish Active"
  | "Bearish Active"
  | "Bullish Weakening"
  | "Bearish Weakening"
  | "Failure Detected"
  | "Flip Confirmed"
  | "Neutral / Ranging";

export type StructureState =
  | "Trending Up"
  | "Trending Down"
  | "Ranging"
  | "Structure Shifting"
  | "Compressed";

export type LevelType =
  | "Swing High"
  | "Swing Low"
  | "Liquidity Sweep"
  | "Strong Reaction Zone"
  | "Break and Retest Zone"
  | "Nearby Target"
  | "Possible Reaction Zone";

export type LevelTag =
  | "Untested"
  | "Tested once"
  | "Tested multiple times"
  | "Liquidity swept"
  | "Strong reaction"
  | "Weak reaction"
  | "Broken"
  | "Retested"
  | "Nearby target"
  | "Possible reaction zone";

export type Relevance = "High relevance" | "Medium relevance" | "Low relevance";

export interface KeyLevel {
  type: LevelType;
  price: string;
  zone?: { from: string; to: string };
  tags: LevelTag[];
  relevance: Relevance;
  score: number;
  reason: string;
  alignedWithBias: boolean;
  higherTimeframe: boolean;
}

export interface SessionContextItem {
  session: "Asia" | "London" | "New York";
  headline: string;
  description: string;
  emphasis: "info" | "watch" | "elevated";
}

export type StyleTimeframes = {
  bias: [string, string];
  structure: [string, string];
  execution: [string, string];
};

export interface MarketContext {
  symbol: string;
  biasState: BiasState;
  structureState: StructureState;
  levels: KeyLevel[];
  sessionContext: SessionContextItem[];
  overview: string;
  timeframes: StyleTimeframes;
  highImpactSoon: boolean;
}

export interface ContextEngineInput {
  asset: Asset;
  quote?: MarketQuote | null;
  upcomingRelevantEvents?: CalendarEvent[];
  traderStyle?: TraderStyle;
}

// ── Style → timeframe mapping ────────────────────────────────

export function getStyleTimeframes(style: TraderStyle = "intraday"): StyleTimeframes {
  if (style === "scalper") {
    return { bias: ["15m", "1H"], structure: ["5m", "15m"], execution: ["1m", "5m"] };
  }
  if (style === "swing") {
    return { bias: ["Daily", "Weekly"], structure: ["4H", "Daily"], execution: ["1H", "4H"] };
  }
  return { bias: ["1H", "4H"], structure: ["15m", "1H"], execution: ["5m", "15m"] };
}

// ── Helpers ──────────────────────────────────────────────────

function toNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return NaN;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function inferDecimals(price: number): number {
  if (price >= 1000) return 1;
  if (price >= 100) return 2;
  if (price >= 10) return 3;
  if (price >= 1) return 4;
  return 5;
}

function fmtPrice(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

// Deterministic pseudo-random seeded by symbol so values are stable per asset.
function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

function seededOffsets(symbol: string, count: number): number[] {
  let seed = seedFromString(symbol);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out.push((seed % 1000) / 1000); // 0..1
  }
  return out;
}

function relevanceFromScore(score: number): Relevance {
  if (score >= 4) return "High relevance";
  if (score >= 2) return "Medium relevance";
  return "Low relevance";
}

// ── Bias state derivation ────────────────────────────────────

export function deriveBiasState(asset: Asset, quote?: MarketQuote | null): BiasState {
  const dir = asset.biasDirection;
  const conf = asset.biasConfidence ?? 0;
  const sentiment = asset.sentiment ?? 0;

  // Quote-vs-bias divergence weakens bias.
  let divergence = false;
  if (quote) {
    if (dir === "Bullish" && quote.direction === "down" && Math.abs(quote.changePercent) > 0.2) divergence = true;
    if (dir === "Bearish" && quote.direction === "up" && Math.abs(quote.changePercent) > 0.2) divergence = true;
  }

  if (dir === "Neutral" || conf < 40) return "Neutral / Ranging";

  if (dir === "Bullish") {
    if (conf < 55 && sentiment < 0) return "Failure Detected";
    if (divergence && conf < 70) return "Bullish Weakening";
    if (divergence) return "Bullish Weakening";
    if (conf < 65) return "Bullish Weakening";
    return "Bullish Active";
  }

  if (dir === "Bearish") {
    if (conf < 55 && sentiment > 0) return "Failure Detected";
    if (divergence && conf < 70) return "Bearish Weakening";
    if (divergence) return "Bearish Weakening";
    if (conf < 65) return "Bearish Weakening";
    return "Bearish Active";
  }

  return "Neutral / Ranging";
}

// ── Structure state derivation ───────────────────────────────

export function deriveStructureState(asset: Asset, quote?: MarketQuote | null): StructureState {
  const dir = asset.biasDirection;
  const conf = asset.biasConfidence ?? 0;
  const change = quote?.changePercent ?? 0;

  if (conf < 45) return "Ranging";
  if (Math.abs(change) < 0.1 && conf < 70) return "Compressed";

  if (dir === "Bullish") {
    if (change < -0.3) return "Structure Shifting";
    return "Trending Up";
  }
  if (dir === "Bearish") {
    if (change > 0.3) return "Structure Shifting";
    return "Trending Down";
  }
  return "Ranging";
}

// ── Level construction (deterministic mock) ──────────────────
// When real OHLC candles become available, replace this function
// with a true swing/sweep detector that returns the same KeyLevel[].

function scoreLevel(opts: {
  tags: LevelTag[];
  higherTimeframe: boolean;
  alignedWithBias: boolean;
  closeToOpposingMajor: boolean;
  messySurrounding: boolean;
}): number {
  let s = 0;
  const t = new Set(opts.tags);
  if (t.has("Liquidity swept")) s += 2;
  if (t.has("Strong reaction")) s += 2;
  if (opts.higherTimeframe) s += 2;
  if (t.has("Retested")) s += 1; // clean break and retest
  if (t.has("Untested")) s += 1;
  if (opts.alignedWithBias) s += 1;

  if (t.has("Tested multiple times")) s -= 2;
  if (t.has("Weak reaction")) s -= 1;
  if (opts.messySurrounding) s -= 1;
  if (t.has("Broken")) s -= 2;
  if (opts.closeToOpposingMajor) s -= 1;

  return s;
}

function buildLevels(asset: Asset, quote: MarketQuote | null | undefined, biasState: BiasState): KeyLevel[] {
  const ref = toNumber(quote?.last) || toNumber(asset.latestPrice);
  if (!Number.isFinite(ref) || ref <= 0) return [];

  const decimals = inferDecimals(ref);
  // Per-asset relative range: use bigger swings for crypto/indices, tighter for FX.
  const rel = asset.category === "crypto" ? 0.025 : asset.category === "index" ? 0.012 : asset.category === "commodity" ? 0.01 : 0.0035;

  const offsets = seededOffsets(asset.symbol, 6);
  const isBull = biasState.startsWith("Bullish");
  const isBear = biasState.startsWith("Bearish");

  // Construct candidate levels around current price.
  const candidates: Array<Omit<KeyLevel, "score" | "relevance"> & { messy: boolean; opposingClose: boolean }> = [
    {
      type: "Swing High",
      price: fmtPrice(ref * (1 + rel * (1 + offsets[0] * 0.6)), decimals),
      tags: ["Tested once"],
      reason: "Recent swing high acting as overhead supply.",
      alignedWithBias: isBear,
      higherTimeframe: false,
      messy: false,
      opposingClose: false,
    },
    {
      type: "Swing Low",
      price: fmtPrice(ref * (1 - rel * (1 + offsets[1] * 0.6)), decimals),
      tags: ["Tested once"],
      reason: "Recent swing low providing demand reference.",
      alignedWithBias: isBull,
      higherTimeframe: false,
      messy: false,
      opposingClose: false,
    },
    {
      type: "Liquidity Sweep",
      price: fmtPrice(ref * (1 + rel * (1.6 + offsets[2] * 0.4) * (isBull ? 1 : -1)), decimals),
      tags: ["Liquidity swept", "Strong reaction"],
      reason: "Stops likely cleared above/below recent extreme; possible reaction zone.",
      alignedWithBias: true,
      higherTimeframe: true,
      messy: false,
      opposingClose: false,
    },
    {
      type: "Break and Retest Zone",
      price: fmtPrice(ref * (1 + rel * (0.4 + offsets[3] * 0.3) * (isBull ? -1 : 1)), decimals),
      tags: ["Broken", "Retested"],
      reason: "Prior structure broken and revisited as confirmation zone.",
      alignedWithBias: isBull || isBear,
      higherTimeframe: false,
      messy: false,
      opposingClose: false,
    },
    {
      type: "Strong Reaction Zone",
      price: fmtPrice(ref * (1 - rel * (1.3 + offsets[4] * 0.5) * (isBull ? 1 : -1)), decimals),
      tags: ["Strong reaction", "Untested"],
      reason: "Higher-timeframe area with prior decisive reaction.",
      alignedWithBias: true,
      higherTimeframe: true,
      messy: false,
      opposingClose: false,
    },
    {
      type: "Nearby Target",
      price: fmtPrice(ref * (1 + rel * (0.8 + offsets[5] * 0.4) * (isBull ? 1 : -1)), decimals),
      tags: ["Nearby target"],
      reason: "Closest unmitigated level in the direction of context.",
      alignedWithBias: true,
      higherTimeframe: false,
      messy: biasState === "Neutral / Ranging",
      opposingClose: false,
    },
  ];

  return candidates.map((c) => {
    const score = scoreLevel({
      tags: c.tags,
      higherTimeframe: c.higherTimeframe,
      alignedWithBias: c.alignedWithBias,
      closeToOpposingMajor: c.opposingClose,
      messySurrounding: c.messy,
    });
    return {
      type: c.type,
      price: c.price,
      tags: c.tags,
      reason: c.reason,
      alignedWithBias: c.alignedWithBias,
      higherTimeframe: c.higherTimeframe,
      score,
      relevance: relevanceFromScore(score),
    };
  });
}

// ── Session context ──────────────────────────────────────────

function currentUtcHour(): number {
  return new Date().getUTCHours();
}

function deriveSessionContext(
  asset: Asset,
  biasState: BiasState,
  highImpactSoon: boolean,
): SessionContextItem[] {
  const hour = currentUtcHour();
  const isAsia = hour >= 0 && hour < 7;
  const isLondon = hour >= 7 && hour < 13;
  const isNY = hour >= 13 && hour < 21;

  const items: SessionContextItem[] = [];

  items.push({
    session: "Asia",
    headline: isAsia ? "Asia session active — range reference" : "Asian range reference",
    description:
      "Lower-volatility window typically forms the reference range used by later sessions.",
    emphasis: isAsia ? "watch" : "info",
  });

  items.push({
    session: "London",
    headline: isLondon ? "London open — liquidity sweep risk" : "London liquidity sweep risk",
    description:
      biasState.includes("Weakening")
        ? "Bias weakening into London; context favours possible reaction at swept liquidity."
        : "London open often sweeps Asian range extremes before establishing direction.",
    emphasis: isLondon ? "elevated" : "watch",
  });

  items.push({
    session: "New York",
    headline: isNY ? "New York volatility window active" : "NY volatility watch",
    description: highImpactSoon
      ? "High-impact data within the NY window — short-term retracement risk elevated."
      : "NY session can extend or reverse the London move; key level to watch.",
    emphasis: highImpactSoon ? "elevated" : isNY ? "watch" : "info",
  });

  // Light asset hint without being advisory.
  if (asset.category === "crypto") {
    items[0].description += " Crypto trades 24/7, so session edges are softer.";
  }

  return items;
}

// ── Overview text ────────────────────────────────────────────

function buildOverview(opts: {
  asset: Asset;
  biasState: BiasState;
  structureState: StructureState;
  levels: KeyLevel[];
  highImpactSoon: boolean;
  nextHighImpactTitle?: string;
}): string {
  const { asset, biasState, structureState, levels, highImpactSoon, nextHighImpactTitle } = opts;

  const reactionZone = levels.find((l) => l.type === "Possible Reaction Zone")
    ?? levels.find((l) => l.type === "Strong Reaction Zone")
    ?? levels.find((l) => l.type === "Liquidity Sweep")
    ?? levels.find((l) => l.type === "Nearby Target");

  const biasSentence = (() => {
    switch (biasState) {
      case "Bullish Active":
        return `${asset.symbol} context favours the upside; bullish bias remains active.`;
      case "Bearish Active":
        return `${asset.symbol} context favours the downside; bearish bias remains active.`;
      case "Bullish Weakening":
        return `${asset.symbol} bullish bias is weakening; short-term retracement risk is elevated.`;
      case "Bearish Weakening":
        return `${asset.symbol} bearish bias is weakening; short-term retracement risk is elevated.`;
      case "Failure Detected":
        return `${asset.symbol} prior bias appears to be failing — context becoming inconclusive.`;
      case "Flip Confirmed":
        return `${asset.symbol} structure has flipped; new directional context forming.`;
      default:
        return `${asset.symbol} is in a neutral / ranging context with no dominant directional pressure.`;
    }
  })();

  const structureSentence = (() => {
    switch (structureState) {
      case "Trending Up":
        return "Structure remains constructive with higher highs / higher lows in place.";
      case "Trending Down":
        return "Structure remains under pressure with lower highs / lower lows in place.";
      case "Structure Shifting":
        return "Structure is shifting — recent move challenges the prevailing read.";
      case "Compressed":
        return "Price is compressed; expansion likely once a key level breaks.";
      default:
        return "Structure is range-bound with no clear directional commitment.";
    }
  })();

  const zoneSentence = reactionZone
    ? `Next key level to watch: ${reactionZone.type.toLowerCase()} near ${reactionZone.price} — possible reaction zone.`
    : "No immediate reaction zone stands out at current price.";

  const newsSentence = highImpactSoon
    ? ` High-impact news risk soon${nextHighImpactTitle ? ` (${nextHighImpactTitle})` : ""} — context can shift quickly.`
    : "";

  return `${biasSentence} ${structureSentence} ${zoneSentence}${newsSentence}`;
}

// ── Public entry point ───────────────────────────────────────

export function buildMarketContext(input: ContextEngineInput): MarketContext {
  const { asset, quote, upcomingRelevantEvents = [], traderStyle = "intraday" } = input;

  const now = Date.now();
  const fourHours = 4 * 60 * 60 * 1000;
  const highImpactSoon = upcomingRelevantEvents.some((e) => {
    if (e.impact !== "high") return false;
    const t = new Date(e.scheduledAt).getTime();
    return Number.isFinite(t) && t >= now && t <= now + fourHours;
  });
  const nextHigh = upcomingRelevantEvents.find((e) => e.impact === "high");

  const biasState = deriveBiasState(asset, quote);
  const structureState = deriveStructureState(asset, quote);
  const levels = buildLevels(asset, quote, biasState);
  const sessionContext = deriveSessionContext(asset, biasState, highImpactSoon);
  const overview = buildOverview({
    asset,
    biasState,
    structureState,
    levels,
    highImpactSoon,
    nextHighImpactTitle: nextHigh?.event,
  });

  return {
    symbol: asset.symbol,
    biasState,
    structureState,
    levels,
    sessionContext,
    overview,
    timeframes: getStyleTimeframes(traderStyle),
    highImpactSoon,
  };
}
