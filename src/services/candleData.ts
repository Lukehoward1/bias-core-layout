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

const MIN_TTL_MS = 60_000; // floor: never cache for less than a minute

/**
 * Returns milliseconds until the next close boundary for the given interval.
 * Bias data only needs refreshing when a candle actually closes, so caching
 * until that moment avoids unnecessary re-fetches mid-candle.
 */
function getNextCandleCloseMs(interval: string): number {
  const now = new Date();
  const nowMs = now.getTime();

  if (interval === "1day") {
    // Next midnight UTC
    const next = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    );
    return Math.max(MIN_TTL_MS, next - nowMs);
  }

  if (interval === "4h") {
    // Closes at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
    const nextCloseHour = (Math.floor(now.getUTCHours() / 4) + 1) * 4;
    const next = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      nextCloseHour, // Date.UTC handles overflow (e.g. hour 24 → next day 00:00)
    );
    return Math.max(MIN_TTL_MS, next - nowMs);
  }

  if (interval === "1h") {
    // Next top of the hour UTC
    const next = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours() + 1,
    );
    return Math.max(MIN_TTL_MS, next - nowMs);
  }

  return 300_000; // 5-minute default for sub-hour intervals
}

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

function setCache(key: string, data: MarketCandle[], interval: string): void {
  candleCache.set(key, { data, expiresAt: Date.now() + getNextCandleCloseMs(interval) });
}

// ── Request queue ─────────────────────────────────────────────
// Limits concurrent Twelve Data fetches to MAX_CONCURRENT.
// Higher-priority tasks (currently-viewed asset) are inserted at the front.

const MAX_CONCURRENT = 6;
let _active = 0;
let _prioritySymbol: string | null = null;

interface QueueTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  priority: number; // higher number = runs first
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _queue: QueueTask<any>[] = [];
const _inFlight = new Map<string, Promise<MarketCandle[]>>();

/** Call when the user navigates to an asset detail view so its fetches run first. */
export function setPrioritySymbol(symbol: string | null): void {
  _prioritySymbol = symbol ? normalizeSymbol(symbol) : null;
}

function _drain(): void {
  while (_active < MAX_CONCURRENT && _queue.length > 0) {
    const task = _queue.shift()!;
    _active++;
    task
      .fn()
      .then(task.resolve, task.reject)
      .finally(() => {
        _active--;
        _drain();
      });
  }
}

function _enqueue<T>(fn: () => Promise<T>, priority: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const task: QueueTask<T> = { fn, resolve, reject, priority };
    // Maintain descending priority order; equal priorities preserve insertion order.
    const idx = _queue.findIndex((e) => e.priority < priority);
    if (idx === -1) {
      _queue.push(task);
    } else {
      _queue.splice(idx, 0, task);
    }
    _drain();
  });
}

// ── Symbol whitelist ──────────────────────────────────────────
// Only these symbols are permitted to call the Twelve Data time_series endpoint.
// This keeps page-load requests within the free-tier limit (~8 req/min, 800/day).
// Expand this set when upgrading to a paid API plan.

export const WHITELIST_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD",
  "NZDUSD", "EURGBP", "EURJPY", "GBPJPY",
  "XAUUSD",
  "NAS100", "US30", "GER40", "UK100",
];

const CANDLE_API_WHITELIST = new Set(WHITELIST_SYMBOLS);

// ── Fetch ────────────────────────────────────────────────────

export async function fetchCandles(
  symbol: string,
  interval: string,
  outputsize: number = 10,
): Promise<MarketCandle[]> {
  const norm = normalizeSymbol(symbol);

  if (!CANDLE_API_WHITELIST.has(norm)) return [];
  const cacheKey = `${norm}:${interval}:${outputsize}`;

  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Return the same promise to any concurrent callers for the same key.
  const inflight = _inFlight.get(cacheKey);
  if (inflight) return inflight;

  const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY;
  if (!apiKey) return [];

  const priority = _prioritySymbol === norm ? 1 : 0;

  const promise = _enqueue(async (): Promise<MarketCandle[]> => {
    // Another request may have populated the cache while we waited in the queue.
    const cached2 = getCached(cacheKey);
    if (cached2) return cached2;

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

    setCache(cacheKey, candles, interval);
    return candles;
  }, priority).finally(() => {
    _inFlight.delete(cacheKey);
  });

  _inFlight.set(cacheKey, promise);
  return promise;
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
