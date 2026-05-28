// src/services/candleData.ts
// ─────────────────────────────────────────────────────────────
// Twelve Data time-series integration for candle analysis.
// Provides single-timeframe and multi-timeframe bias signals.
// ─────────────────────────────────────────────────────────────

import { toProviderSymbol, normalizeSymbol } from "./marketData";
import type { MarketCandle } from "./marketData";
import type { BiasState } from "./contextEngine";
import type { TraderStyle } from "@/context/TraderStyleProvider";

// ── Types ────────────────────────────────────────────────────

export interface TimeframeBias {
  bias: "bullish" | "bearish" | "neutral";
  confidence: number;
  reason: string;
}

export interface MultiTimeframeBias {
  biasState: BiasState;
  confidence: number;
  dailyBias: TimeframeBias;
  fourHourBias: TimeframeBias;
}

// ── Cache ────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  data: MarketCandle[];
  expiresAt: number;
}

const candleCache = new Map<string, CacheEntry>();

function getCached(key: string): MarketCandle[] | null {
  const entry = candleCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    candleCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: MarketCandle[]): void {
  candleCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Fetch ────────────────────────────────────────────────────

export async function fetchCandles(
  symbol: string,
  interval: string,
  outputsize: number = 10,
): Promise<MarketCandle[]> {
  const norm = normalizeSymbol(symbol);
  const cacheKey = `${norm}:${interval}:${outputsize}`;

  const cached = getCached(cacheKey);
  if (cached) return cached;

  const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) return [];

  const providerSymbol = toProviderSymbol(norm);
  const url =
    `https://api.twelvedata.com/time_series` +
    `?symbol=${encodeURIComponent(providerSymbol)}` +
    `&interval=${interval}` +
    `&outputsize=${outputsize}` +
    `&apikey=${apiKey}`;

  let json: Record<string, unknown>;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    json = await res.json();
  } catch {
    return [];
  }

  if (json.status === "error" || !Array.isArray(json.values)) return [];

  // Twelve Data returns values newest-first — preserve that order.
  const candles: MarketCandle[] = (json.values as Record<string, string>[]).map((v) => ({
    symbol: norm,
    timeframe: interval,
    timestamp: new Date(v.datetime).getTime(),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: parseFloat(v.volume ?? "0"),
  }));

  setCache(cacheKey, candles);
  return candles;
}

// ── Single-candle helper ─────────────────────────────────────

/** Returns the last fully-closed candle (index 1 when newest-first). */
export async function getLastClosedCandle(
  symbol: string,
  interval: string,
): Promise<MarketCandle | null> {
  const candles = await fetchCandles(symbol, interval, 3);
  return candles[1] ?? null;
}

// ── Bias analysis ────────────────────────────────────────────

const NEUTRAL: TimeframeBias = {
  bias: "neutral",
  confidence: 50,
  reason: "No decisive structure break or rejection",
};

function analyzeBias(candles: MarketCandle[], interval: string): TimeframeBias {
  if (candles.length < 3) {
    return { bias: "neutral", confidence: 0, reason: "Insufficient candle data" };
  }

  // candles[0] = currently forming, candles[1] = last closed, candles[2] = prior closed
  const last = candles[1];
  const prior = candles[2];

  const label = interval === "1day" ? "daily" : interval;

  // Strong directional close outside the prior range
  if (last.close > prior.high) {
    return {
      bias: "bullish",
      confidence: 80,
      reason: `Closed above prior ${label} high (${prior.high.toFixed(5)})`,
    };
  }
  if (last.close < prior.low) {
    return {
      bias: "bearish",
      confidence: 80,
      reason: `Closed below prior ${label} low (${prior.low.toFixed(5)})`,
    };
  }

  // Wick rejection — candle swept beyond prior range but closed back inside
  const closedInside = last.close <= prior.high && last.close >= prior.low;

  if (last.low < prior.low && closedInside) {
    return {
      bias: "bullish",
      confidence: 65,
      reason: `Wick swept below prior ${label} low then closed inside — bullish rejection`,
    };
  }
  if (last.high > prior.high && closedInside) {
    return {
      bias: "bearish",
      confidence: 65,
      reason: `Wick swept above prior ${label} high then closed inside — bearish rejection`,
    };
  }

  return NEUTRAL;
}

export async function getDailyBias(symbol: string): Promise<TimeframeBias> {
  try {
    const candles = await fetchCandles(symbol, "1day", 3);
    return analyzeBias(candles, "1day");
  } catch {
    return { bias: "neutral", confidence: 0, reason: "Error fetching daily data" };
  }
}

export async function get4HBias(symbol: string): Promise<TimeframeBias> {
  try {
    const candles = await fetchCandles(symbol, "4h", 3);
    return analyzeBias(candles, "4h");
  } catch {
    return { bias: "neutral", confidence: 0, reason: "Error fetching 4H data" };
  }
}

// ── Multi-timeframe combination ──────────────────────────────

// ── Real price levels from candle data ───────────────────────

export interface RealLevels {
  prevDayHigh: number;
  prevDayLow: number;
  recentSwingHigh: number;
  recentSwingLow: number;
  majorSwingHigh: number;
  majorSwingLow: number;
  fourHourSwingHigh: number;
  fourHourSwingLow: number;
}

export async function getRealLevels(symbol: string, _style: TraderStyle): Promise<RealLevels | null> {
  try {
    const [dailyCandles, fourHourCandles] = await Promise.all([
      fetchCandles(symbol, "1day", 20),
      fetchCandles(symbol, "4h", 20),
    ]);

    // Need at least 6 daily candles (index 0 = forming, 1..5 = 5 closed)
    if (dailyCandles.length < 6 || fourHourCandles.length < 10) return null;

    const prevDay = dailyCandles[1]; // last fully closed daily
    const recentClosed = dailyCandles.slice(1, 6); // 5 closed daily candles
    const majorClosed = dailyCandles.slice(1); // all closed from the 20 fetched
    const fourHourSlice = fourHourCandles.slice(0, 10); // last 10 4H candles

    return {
      prevDayHigh: prevDay.high,
      prevDayLow: prevDay.low,
      recentSwingHigh: Math.max(...recentClosed.map((c) => c.high)),
      recentSwingLow: Math.min(...recentClosed.map((c) => c.low)),
      majorSwingHigh: Math.max(...majorClosed.map((c) => c.high)),
      majorSwingLow: Math.min(...majorClosed.map((c) => c.low)),
      fourHourSwingHigh: Math.max(...fourHourSlice.map((c) => c.high)),
      fourHourSwingLow: Math.min(...fourHourSlice.map((c) => c.low)),
    };
  } catch {
    return null;
  }
}

export async function getMultiTimeframeBias(
  symbol: string,
  _style: TraderStyle,
): Promise<MultiTimeframeBias> {
  const [dailyBias, fourHourBias] = await Promise.all([getDailyBias(symbol), get4HBias(symbol)]);

  let biasState: BiasState;
  let confidence: number;

  const d = dailyBias.bias;
  const h = fourHourBias.bias;

  if (d === "bullish" && h === "bullish") {
    biasState = "Bullish Active";
    confidence = Math.max(85, Math.round((dailyBias.confidence + fourHourBias.confidence) / 2));
  } else if (d === "bearish" && h === "bearish") {
    biasState = "Bearish Active";
    confidence = Math.max(85, Math.round((dailyBias.confidence + fourHourBias.confidence) / 2));
  } else if (d === "bullish" && h === "bearish") {
    // Higher TF bullish but lower TF pulling back — weakening
    biasState = "Bullish Weakening";
    confidence = 50;
  } else if (d === "bearish" && h === "bullish") {
    // Higher TF bearish but lower TF bouncing — weakening
    biasState = "Bearish Weakening";
    confidence = 50;
  } else {
    biasState = "Neutral / Ranging";
    confidence = Math.round((dailyBias.confidence + fourHourBias.confidence) / 2);
  }

  return { biasState, confidence, dailyBias, fourHourBias };
}
