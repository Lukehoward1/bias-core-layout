// src/services/contextEngine.ts
import type { Asset } from "@/data/assets";
import type { MarketQuote } from "@/services/marketData";
import type { CalendarEvent } from "@/data/calendarEvents";
import type { TraderStyle } from "@/context/TraderStyleProvider";
import { getMultiTimeframeBias, getRealLevels } from "./candleData";

export type BiasState =
  | "Bullish Active"
  | "Bearish Active"
  | "Bullish Weakening"
  | "Bearish Weakening"
  | "Failure Detected"
  | "Flip Confirmed"
  | "Neutral / Ranging";

export type StructureState = "Trending Up" | "Trending Down" | "Ranging" | "Structure Shifting" | "Consolidating";

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

export type TimeframeState = "bullish" | "weakening" | "bearish" | "liquidity" | "neutral";

export interface TimeframeContextItem {
  timeframe: string;
  state: TimeframeState;
  label: string;
  detail: string;
}

export interface MarketContext {
  symbol: string;
  biasState: BiasState;
  structureState: StructureState;
  levels: KeyLevel[];
  sessionContext: SessionContextItem[];
  overview: string;
  timeframes: StyleTimeframes;
  timeframeContext: TimeframeContextItem[];
  highImpactSoon: boolean;
}

export interface ContextEngineInput {
  asset: Asset;
  quote?: MarketQuote | null;
  upcomingRelevantEvents?: CalendarEvent[];
  traderStyle?: TraderStyle;
}

export function getStyleTimeframes(style: TraderStyle = "intraday"): StyleTimeframes {
  if (style === "scalper") {
    return { bias: ["15m", "1H"], structure: ["5m", "15m"], execution: ["1m", "5m"] };
  }

  if (style === "swing") {
    return { bias: ["Daily", "Weekly"], structure: ["4H", "Daily"], execution: ["1H", "4H"] };
  }

  return { bias: ["1H", "4H"], structure: ["15m", "1H"], execution: ["5m", "15m"] };
}

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

function relevanceFromScore(score: number): Relevance {
  if (score >= 4) return "High relevance";
  if (score >= 2) return "Medium relevance";
  return "Low relevance";
}

function getInstrumentRange(asset: Asset, ref: number): number {
  if (asset.category === "Crypto") return ref * 0.025;
  if (asset.category === "Indices") return ref * 0.012;
  if (asset.category === "Commodities") return ref * 0.01;
  if (asset.category === "Futures") return ref * 0.01;
  if (asset.category === "ETFs") return ref * 0.008;
  return ref * 0.0035;
}

function scoreLevel(opts: {
  tags: LevelTag[];
  higherTimeframe: boolean;
  alignedWithBias: boolean;
  messySurrounding?: boolean;
}): number {
  let score = 0;
  const tags = new Set(opts.tags);

  if (tags.has("Liquidity swept")) score += 2;
  if (tags.has("Strong reaction")) score += 2;
  if (opts.higherTimeframe) score += 2;
  if (tags.has("Retested")) score += 1;
  if (tags.has("Untested")) score += 1;
  if (opts.alignedWithBias) score += 1;

  if (tags.has("Tested multiple times")) score -= 2;
  if (tags.has("Weak reaction")) score -= 1;
  if (tags.has("Broken")) score -= 2;
  if (opts.messySurrounding) score -= 1;

  return score;
}

export function deriveBiasState(asset: Asset, quote?: MarketQuote | null): BiasState {
  const direction = asset.biasDirection;
  const confidence = asset.biasConfidence ?? 0;
  const sentiment = asset.sentiment ?? 0;
  const change = quote?.changePercent ?? 0;

  if (direction === "Neutral" || confidence < 42) return "Neutral / Ranging";

  const quoteAgainstBullish = direction === "Bullish" && change < -0.2;
  const quoteAgainstBearish = direction === "Bearish" && change > 0.2;

  if (direction === "Bullish") {
    if (confidence < 55 && sentiment < 0) return "Failure Detected";
    if (quoteAgainstBullish || confidence < 65) return "Bullish Weakening";
    return "Bullish Active";
  }

  if (direction === "Bearish") {
    if (confidence < 55 && sentiment > 0) return "Failure Detected";
    if (quoteAgainstBearish || confidence < 65) return "Bearish Weakening";
    return "Bearish Active";
  }

  return "Neutral / Ranging";
}

export function deriveStructureState(asset: Asset, quote?: MarketQuote | null): StructureState {
  const direction = asset.biasDirection;
  const confidence = asset.biasConfidence ?? 0;
  const change = quote?.changePercent ?? 0;

  if (confidence < 45) return "Ranging";
  if (Math.abs(change) < 0.1 && confidence < 70) return "Consolidating";

  if (direction === "Bullish") {
    if (change < -0.3) return "Structure Shifting";
    return "Trending Up";
  }

  if (direction === "Bearish") {
    if (change > 0.3) return "Structure Shifting";
    return "Trending Down";
  }

  return "Ranging";
}

function makeLevel(input: {
  type: LevelType;
  price: number;
  decimals: number;
  tags: LevelTag[];
  reason: string;
  alignedWithBias: boolean;
  higherTimeframe: boolean;
  messySurrounding?: boolean;
}): KeyLevel {
  const score = scoreLevel({
    tags: input.tags,
    higherTimeframe: input.higherTimeframe,
    alignedWithBias: input.alignedWithBias,
    messySurrounding: input.messySurrounding,
  });

  return {
    type: input.type,
    price: fmtPrice(input.price, input.decimals),
    tags: input.tags,
    reason: input.reason,
    alignedWithBias: input.alignedWithBias,
    higherTimeframe: input.higherTimeframe,
    score,
    relevance: relevanceFromScore(score),
  };
}

async function buildLevels(
  asset: Asset,
  quote: MarketQuote | null | undefined,
  biasState: BiasState,
  traderStyle: TraderStyle,
): Promise<KeyLevel[]> {
  const ref = toNumber(asset.latestPrice) || toNumber(quote?.last);
  if (!Number.isFinite(ref) || ref <= 0) return [];

  const decimals = inferDecimals(ref);
  const isBullish = biasState.startsWith("Bullish");
  const isBearish = biasState.startsWith("Bearish");
  const isNeutral = biasState === "Neutral / Ranging";

  // Attempt to use real candle-derived levels
  const real = isNeutral ? null : await getRealLevels(asset.symbol, traderStyle);

  if (real) {
    const {
      prevDayHigh,
      prevDayLow,
      recentSwingHigh,
      recentSwingLow,
      majorSwingHigh,
      majorSwingLow,
      fourHourSwingHigh,
      fourHourSwingLow,
    } = real;

    // Nearest real level above/below current price for the directional target
    const upsideCandidates = [prevDayHigh, recentSwingHigh, fourHourSwingHigh, majorSwingHigh].filter(
      (l) => l > ref,
    );
    const downsideCandidates = [prevDayLow, recentSwingLow, fourHourSwingLow, majorSwingLow].filter(
      (l) => l < ref,
    );
    const nearestAbove = upsideCandidates.length > 0 ? Math.min(...upsideCandidates) : majorSwingHigh;
    const nearestBelow = downsideCandidates.length > 0 ? Math.max(...downsideCandidates) : majorSwingLow;

    const levels: KeyLevel[] = [];

    levels.push(
      makeLevel({
        type: "Swing High",
        price: prevDayHigh,
        decimals,
        tags: ["Tested once", "Possible reaction zone"],
        reason: "Previous day high — nearest overhead swing area where price may react.",
        alignedWithBias: isBearish,
        higherTimeframe: false,
      }),
    );

    levels.push(
      makeLevel({
        type: "Swing Low",
        price: prevDayLow,
        decimals,
        tags: ["Tested once", "Possible reaction zone"],
        reason: "Previous day low — nearest downside swing area acting as the closest demand reference.",
        alignedWithBias: isBullish,
        higherTimeframe: false,
      }),
    );

    levels.push(
      makeLevel({
        type: "Strong Reaction Zone",
        price: isBullish ? majorSwingLow : majorSwingHigh,
        decimals,
        tags: ["Strong reaction", "Untested"],
        reason: isBullish
          ? "Major 20-day swing low — higher-timeframe demand reference useful as a pullback/invalidation area."
          : "Major 20-day swing high — higher-timeframe supply reference useful as a bounce/invalidation area.",
        alignedWithBias: true,
        higherTimeframe: true,
      }),
    );

    levels.push(
      makeLevel({
        type: "Nearby Target",
        price: isBearish ? nearestBelow : nearestAbove,
        decimals,
        tags: ["Nearby target", "Untested"],
        reason: isBearish
          ? "Closest real downside reference in the current directional context."
          : "Closest real upside reference in the current directional context.",
        alignedWithBias: true,
        higherTimeframe: false,
      }),
    );

    levels.push(
      makeLevel({
        type: "Break and Retest Zone",
        price: isBearish ? fourHourSwingHigh : fourHourSwingLow,
        decimals,
        tags: ["Retested", "Possible reaction zone"],
        reason: isBearish
          ? "4H swing high above price — prior resistance that may act as a retest zone."
          : "4H swing low below price — prior support that may act as a retest zone.",
        alignedWithBias: true,
        higherTimeframe: false,
      }),
    );

    levels.push(
      makeLevel({
        type: "Liquidity Sweep",
        price: isBearish ? recentSwingLow : recentSwingHigh,
        decimals,
        tags: ["Liquidity swept", "Possible reaction zone"],
        reason: isBearish
          ? "Recent 5-day swing low — downside liquidity area; reaction depends on acceptance or reclaim."
          : "Recent 5-day swing high — upside liquidity area; reaction depends on acceptance or rejection.",
        alignedWithBias: true,
        higherTimeframe: false,
      }),
    );

    return levels.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  // Fallback: percentage-offset estimates when candle data is unavailable
  const range = getInstrumentRange(asset, ref);
  const upside1 = ref + range * 0.75;
  const upside2 = ref + range * 1.45;
  const downside1 = ref - range * 0.75;
  const downside2 = ref - range * 1.45;

  const levels: KeyLevel[] = [];

  levels.push(
    makeLevel({
      type: "Swing High",
      price: upside1,
      decimals,
      tags: ["Tested once", "Possible reaction zone"],
      reason: "Nearest overhead swing area where price may react if upside continuation persists.",
      alignedWithBias: isBearish,
      higherTimeframe: false,
    }),
  );

  levels.push(
    makeLevel({
      type: "Swing Low",
      price: downside1,
      decimals,
      tags: ["Tested once", "Possible reaction zone"],
      reason: "Nearest downside swing area acting as the closest pullback or demand reference.",
      alignedWithBias: isBullish,
      higherTimeframe: false,
    }),
  );

  levels.push(
    makeLevel({
      type: "Strong Reaction Zone",
      price: isBullish ? downside2 : upside2,
      decimals,
      tags: ["Strong reaction", "Untested"],
      reason: isBullish
        ? "Higher-timeframe demand reference below current price; useful as a pullback/invalidation area."
        : isBearish
          ? "Higher-timeframe supply reference above current price; useful as a bounce/invalidation area."
          : "Higher-timeframe reaction area near current range extremes.",
      alignedWithBias: !isNeutral,
      higherTimeframe: true,
    }),
  );

  levels.push(
    makeLevel({
      type: "Nearby Target",
      price: isBearish ? downside2 : upside2,
      decimals,
      tags: ["Nearby target", "Untested"],
      reason: isBearish
        ? "Closest downside reference in the current directional context."
        : isBullish
          ? "Closest upside reference in the current directional context."
          : "Outer range reference while market remains neutral.",
      alignedWithBias: !isNeutral,
      higherTimeframe: false,
      messySurrounding: isNeutral,
    }),
  );

  levels.push(
    makeLevel({
      type: "Break and Retest Zone",
      price: isBearish ? upside1 : downside1,
      decimals,
      tags: ["Retested", "Possible reaction zone"],
      reason: isBearish
        ? "Prior support/resistance area above price that may act as a retest zone."
        : "Prior support/resistance area below price that may act as a retest zone.",
      alignedWithBias: !isNeutral,
      higherTimeframe: false,
    }),
  );

  levels.push(
    makeLevel({
      type: "Liquidity Sweep",
      price: isBearish ? downside1 : upside1,
      decimals,
      tags: ["Liquidity swept", "Possible reaction zone"],
      reason: isBearish
        ? "Downside liquidity area near recent lows; reaction depends on acceptance or reclaim."
        : "Upside liquidity area near recent highs; reaction depends on acceptance or rejection.",
      alignedWithBias: !isNeutral,
      higherTimeframe: false,
    }),
  );

  return levels.sort((a, b) => b.score - a.score).slice(0, 6);
}

function currentUtcHour(): number {
  return new Date().getUTCHours();
}

function deriveSessionContext(asset: Asset, biasState: BiasState, highImpactSoon: boolean): SessionContextItem[] {
  const hour = currentUtcHour();
  const isAsia = hour >= 0 && hour < 7;
  const isLondon = hour >= 7 && hour < 13;
  const isNY = hour >= 13 && hour < 21;
  const weakening = biasState.includes("Weakening") || biasState === "Failure Detected";

  return [
    {
      session: "Asia",
      headline: isAsia ? "Asia session forming range" : "Asian range reference",
      description:
        asset.category === "Crypto"
          ? "Crypto trades continuously, but session highs/lows can still act as reaction references."
          : "Asian high and low act as reference points for later liquidity sweeps.",
      emphasis: isAsia ? "watch" : "info",
    },
    {
      session: "London",
      headline: isLondon ? "London liquidity window active" : "London sweep awareness",
      description: weakening
        ? "Bias is weakening into the London window; watch how price reacts around session extremes."
        : "London often tests Asian range highs/lows before directional intent becomes clearer.",
      emphasis: isLondon ? "elevated" : "watch",
    },
    {
      session: "New York",
      headline: isNY ? "New York volatility window active" : "NY continuation/reversal watch",
      description: highImpactSoon
        ? "Relevant high-impact news is close; short-term structure can shift quickly."
        : "NY can extend the London move or reverse from earlier liquidity areas.",
      emphasis: highImpactSoon ? "elevated" : isNY ? "watch" : "info",
    },
  ];
}

function buildOverview(opts: {
  asset: Asset;
  biasState: BiasState;
  structureState: StructureState;
  levels: KeyLevel[];
  highImpactSoon: boolean;
  nextHighImpactTitle?: string;
}): string {
  const { asset, biasState, structureState, levels, highImpactSoon, nextHighImpactTitle } = opts;

  const target = levels.find((level) => level.type === "Nearby Target");
  const reaction = levels.find((level) => level.type === "Strong Reaction Zone") ?? levels[0];

  const biasText =
    biasState === "Bullish Active"
      ? `${asset.symbol} remains supported by bullish context.`
      : biasState === "Bearish Active"
        ? `${asset.symbol} remains pressured by bearish context.`
        : biasState === "Bullish Weakening"
          ? `${asset.symbol} bullish context is weakening; pullback risk is elevated.`
          : biasState === "Bearish Weakening"
            ? `${asset.symbol} bearish context is weakening; rejection risk is elevated.`
            : biasState === "Failure Detected"
              ? `${asset.symbol} is showing failure characteristics against the prior bias.`
              : `${asset.symbol} is currently range-bound with limited directional conviction.`;

  const structureText =
    structureState === "Trending Up"
      ? "Structure is trending higher."
      : structureState === "Trending Down"
        ? "Structure is trending lower."
        : structureState === "Structure Shifting"
          ? "Structure is shifting against the prior read."
          : structureState === "Consolidating"
            ? "Price is consolidating inside the current range."
            : "Structure remains choppy/ranging.";

  const levelText = target
    ? `Next area to monitor is ${target.price}.`
    : reaction
      ? `Primary reaction area is near ${reaction.price}.`
      : "No clear reaction area is available.";

  const newsText = highImpactSoon
    ? ` Relevant high-impact news risk is close${nextHighImpactTitle ? ` (${nextHighImpactTitle})` : ""}.`
    : "";

  return `${biasText} ${structureText} ${levelText}${newsText}`;
}

function getDefaultTimeframesForStyle(style: TraderStyle): [string, string, string] {
  if (style === "scalper") return ["1m", "5m", "15m"];
  if (style === "swing") return ["1H", "4H", "Daily"];
  return ["5m", "15m", "1H"];
}

function buildTimeframeContext(
  asset: Asset,
  biasState: BiasState,
  structureState: StructureState,
  quote: MarketQuote | null | undefined,
  highImpactSoon: boolean,
  style: TraderStyle,
): TimeframeContextItem[] {
  const timeframes = getDefaultTimeframesForStyle(style);
  const direction = asset.biasDirection;
  const change = quote?.changePercent ?? 0;
  const weakening = biasState.includes("Weakening");
  const failure = biasState === "Failure Detected";
  const neutral = biasState === "Neutral / Ranging";

  return timeframes.map((timeframe, index) => {
    if (index === 2) {
      if (neutral) {
        return {
          timeframe,
          state: "neutral",
          label: "HTF neutral",
          detail: "Higher timeframe direction is not clearly committed.",
        };
      }

      if (failure) {
        return {
          timeframe,
          state: "weakening",
          label: "HTF challenged",
          detail: "Higher timeframe bias is being challenged.",
        };
      }

      return {
        timeframe,
        state: direction === "Bullish" ? "bullish" : "bearish",
        label: "HTF bias intact",
        detail: `${direction} higher timeframe context remains intact.`,
      };
    }

    if (index === 1) {
      if (structureState === "Ranging" || neutral) {
        return {
          timeframe,
          state: "neutral",
          label: "Neutral / choppy",
          detail: "Structure lacks clean directional commitment.",
        };
      }

      if (failure) {
        return {
          timeframe,
          state: "bearish",
          label: "Structure failure",
          detail: "Mid-timeframe structure has failed to hold prior context.",
        };
      }

      if (weakening || structureState === "Structure Shifting") {
        return {
          timeframe,
          state: "weakening",
          label: "Structure weakening",
          detail: "Momentum is fading and reaction risk is elevated.",
        };
      }

      if (structureState === "Consolidating") {
        return {
          timeframe,
          state: "neutral",
          label: "Consolidating",
          detail: "Price is moving inside a defined range; watch for acceptance above or below.",
        };
      }

      return {
        timeframe,
        state: direction === "Bullish" ? "bullish" : "bearish",
        label: direction === "Bullish" ? "Structure holding" : "Structure pressing lower",
        detail: "Mid-timeframe structure remains aligned with current context.",
      };
    }

    if (highImpactSoon) {
      return {
        timeframe,
        state: "liquidity",
        label: "News-sensitive",
        detail: "Short-term price may react sharply around upcoming news.",
      };
    }

    if (failure) {
      return {
        timeframe,
        state: "bearish",
        label: "Short-term break",
        detail: "Short-term structure has broken against prior context.",
      };
    }

    if (weakening) {
      return {
        timeframe,
        state: "weakening",
        label: direction === "Bearish" ? "Rejection risk" : "Pullback risk",
        detail: "Short-term momentum is no longer clean.",
      };
    }

    if (structureState === "Consolidating") {
      return {
        timeframe,
        state: "neutral",
        label: "Inside range",
        detail: "Short-term price is consolidating; range high/low are the important references.",
      };
    }

    if (neutral) {
      return {
        timeframe,
        state: "neutral",
        label: "Choppy",
        detail: "Short-term movement lacks clean direction.",
      };
    }

    if (direction === "Bullish") {
      return {
        timeframe,
        state: change < -0.1 ? "weakening" : "bullish",
        label: change < -0.1 ? "Pullback forming" : "Continuation holding",
        detail: "Short-term price remains inside bullish context.",
      };
    }

    if (direction === "Bearish") {
      return {
        timeframe,
        state: change > 0.1 ? "weakening" : "bearish",
        label: change > 0.1 ? "Bounce forming" : "Continuation lower",
        detail: "Short-term price remains inside bearish context.",
      };
    }

    return {
      timeframe,
      state: "neutral",
      label: "Neutral",
      detail: "Short-term context is unclear.",
    };
  });
}

export async function buildMarketContext(input: ContextEngineInput): Promise<MarketContext> {
  const { asset, quote, upcomingRelevantEvents = [], traderStyle = "intraday" } = input;

  const now = Date.now();
  const fourHours = 4 * 60 * 60 * 1000;

  const highImpactSoon = upcomingRelevantEvents.some((event) => {
    if (event.impact !== "high") return false;
    const eventTime = new Date(event.scheduledAt).getTime();
    return Number.isFinite(eventTime) && eventTime >= now && eventTime <= now + fourHours;
  });

  const nextHigh = upcomingRelevantEvents.find((event) => event.impact === "high");

  let biasState: BiasState;
  let structureState: StructureState;
  try {
    const mtf = await getMultiTimeframeBias(asset.symbol, traderStyle);
    if (mtf.biasState !== "Neutral / Ranging") {
      biasState = mtf.biasState;
      structureState =
        mtf.confidence > 75
          ? biasState.startsWith("Bullish")
            ? "Trending Up"
            : "Trending Down"
          : deriveStructureState(asset, quote);
    } else {
      biasState = deriveBiasState(asset, quote);
      structureState = deriveStructureState(asset, quote);
    }
  } catch {
    biasState = deriveBiasState(asset, quote);
    structureState = deriveStructureState(asset, quote);
  }
  const levels = await buildLevels(asset, quote, biasState, traderStyle);
  const sessionContext = deriveSessionContext(asset, biasState, highImpactSoon);
  const timeframeContext = buildTimeframeContext(asset, biasState, structureState, quote, highImpactSoon, traderStyle);

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
    timeframeContext,
    highImpactSoon,
  };
}
