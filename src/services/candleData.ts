// src/services/candleData.ts
// ─────────────────────────────────────────────────────────────
// Twelve Data time-series integration for candle analysis.
// Provides single-timeframe and multi-timeframe bias signals.
// ─────────────────────────────────────────────────────────────

import { normalizeSymbol } from "./marketData";
import type { MarketCandle } from "./marketData";
import type { BiasState } from "./contextEngine";
import type { TfCode } from "@/data/timeframes";
import { TRADE_INSTRUMENTS } from "@/data/tradeInstruments";
import { activeProvider } from "./activeProvider";
import type { TraderTimeframes, TfRole } from "./traderTimeframes";
import { ROLE_WEIGHT } from "./traderTimeframes";
import { MOCK_CANDLES_ENABLED, generateMockCandles } from "@/lib/mockCandleGenerator";
import {
  REQUESTS_PER_MIN,
  PRIORITY_CHART,
  PRIORITY_BIAS,
  PRIORITY_LEVELS,
  _callTimestamps,
  msToWait,
  waitForSlot,
  enqueueApiRequest,
  getSlotLimit,
  getPrioritySymbol,
  setPrioritySymbol,
} from "./apiQueue";

export { REQUESTS_PER_MIN, PRIORITY_CHART, PRIORITY_BIAS, PRIORITY_LEVELS, setPrioritySymbol };
/** @deprecated Use REQUESTS_PER_MIN */ export const TS_MAX_PER_MIN = REQUESTS_PER_MIN;

// ── Types ────────────────────────────────────────────────────

export interface TimeframeBias {
  bias: "bullish" | "bearish" | "neutral";
  confidence: number;
  reason: string;
}

export interface TriTimeframeBiasRole {
  tf: TfCode;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  reason: string;
}

export interface TriTimeframeBias {
  biasState: BiasState;
  confidence: number;
  timeframes: TraderTimeframes;
  perRole: Record<TfRole, TriTimeframeBiasRole>;
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

export interface CacheEntry {
  data: MarketCandle[]; // newest-first, length up to STANDARD_SIZE
  expiresAt: number;
}

/** One size per (sym, interval) so chart (150) and bias (20) share one upstream call. */
export const STANDARD_SIZE = 150;

/** Pure: cache lookup. Exported for tests. */
export function pickCachedCandles(
  entry: CacheEntry | undefined,
  requested: number,
  nowMs: number,
): MarketCandle[] | null {
  if (!entry) return null;
  if (nowMs > entry.expiresAt) return null;
  if (entry.data.length < requested) return null;
  return entry.data.slice(0, requested);
}

/** Pure: cache-key builder. Exported for tests. */
export function makeCacheKey(norm: string, interval: string): string {
  return `${norm}:${interval}`;
}

const candleCache = new Map<string, CacheEntry>();

function getCached(key: string, requested: number): MarketCandle[] | null {
  const entry = candleCache.get(key);
  const hit = pickCachedCandles(entry, requested, Date.now());
  if (!hit && entry && Date.now() > entry.expiresAt) candleCache.delete(key);
  return hit;
}

function setCache(key: string, data: MarketCandle[], interval: string): void {
  candleCache.set(key, { data, expiresAt: Date.now() + getNextCandleCloseMs(interval) });
}

// ── Restricted-symbol tracking ────────────────────────────────
// (symbol, interval) pairs permanently marked restricted by the active provider.
// Keyed as "NORM:interval". Set on first restricted result; cleared on page reload.
const _restrictedKeys = new Set<string>();

function _restrictedKey(norm: string, interval?: string): string {
  return interval ? `${norm}:${interval}` : norm;
}

export function isSymbolRestricted(symbol: string, interval?: string): boolean {
  const norm = normalizeSymbol(symbol);
  if (interval) return _restrictedKeys.has(_restrictedKey(norm, interval));
  for (const k of _restrictedKeys) {
    if (k === norm || k.startsWith(`${norm}:`)) return true;
  }
  return false;
}

// Re-export for tests (msToWait moved to apiQueue.ts)
export { msToWait };

// In-flight promise resolves to the FULL upstream array (STANDARD_SIZE);
// callers slice to their requested outputsize. One upstream call serves all.
const _inFlight = new Map<string, Promise<MarketCandle[]>>();

// ── Symbol whitelist ──────────────────────────────────────────
// Only these symbols are permitted to call the Twelve Data time_series endpoint.
// This keeps page-load requests within the free-tier limit (~8 req/min, 800/day).
// Expand this set when upgrading to a paid API plan.

export const WHITELIST_SYMBOLS = TRADE_INSTRUMENTS.map((i) => i.symbol);

const CANDLE_API_WHITELIST = new Set(WHITELIST_SYMBOLS);

export function isBiasAvailable(symbol: string): boolean {
  return CANDLE_API_WHITELIST.has(normalizeSymbol(symbol));
}

// ── Fetch ────────────────────────────────────────────────────

// Retry backoffs: 8 s then 20 s.
const RETRY_BACKOFFS_MS = [8_000, 20_000];

/**
 * Pure: returns the ms delay before retry attempt `n`, or null to stop retrying.
 * attempt=0 → first retry; attempt >= backoffs.length → stop (exhausted).
 * Exported for tests.
 */
export function retryDelay(attempt: number, backoffs: readonly number[]): number | null {
  if (attempt < 0 || attempt >= backoffs.length) return null;
  return backoffs[attempt];
}

function debugCandles(
  sym: string, interval: string, attempt: number,
  slotWaitMs: number, queueLen: number, resultKind: string, callMs: number,
): void {
  try {
    if (typeof localStorage === 'undefined' || localStorage.getItem('debugCandles') !== '1') return;
  } catch { return; }
  console.debug(`[candles] ${sym}:${interval} attempt=${attempt} slotWait=${slotWaitMs}ms call=${callMs}ms queue=${queueLen} result=${resultKind}`);
}

export async function fetchCandles(
  symbol: string,
  interval: string,
  outputsize: number = 10,
  priority: number = PRIORITY_BIAS,
): Promise<MarketCandle[]> {
  const norm = normalizeSymbol(symbol);

  if (!CANDLE_API_WHITELIST.has(norm)) return [];

  // ── Mock mode (dev only) ──────────────────────────────────
  // Generates deterministic candles without any network calls.
  // Uses the same cache so repeated calls are free.
  if (MOCK_CANDLES_ENABLED) {
    const mockKey = makeCacheKey(norm, interval);
    const mockCached = getCached(mockKey, outputsize);
    if (mockCached) return mockCached;
    const full = generateMockCandles(norm, interval, STANDARD_SIZE);
    setCache(mockKey, full, interval);
    return full.slice(0, outputsize);
  }

  const key = makeCacheKey(norm, interval);

  const cached = getCached(key, outputsize);
  if (cached) return cached;

  // Share the in-flight promise with any concurrent callers for the same key.
  // We always fetch the STANDARD_SIZE superset upstream, so a 150-bar chart
  // request and a 20-bar bias request coalesce to one upstream call.
  const inflight = _inFlight.get(key);
  if (inflight) {
    const full = await inflight;
    return full.slice(0, outputsize);
  }

  const upstreamSize = Math.max(outputsize, STANDARD_SIZE);
  // getPrioritySymbol() (set by Trade/AssetDetail page) boosts to PRIORITY_CHART;
  // callers pass their own tier (PRIORITY_BIAS for analysis, PRIORITY_LEVELS for overlays).
  const effectivePriority = getPrioritySymbol() === norm ? PRIORITY_CHART : priority;
  const slotLimit = getSlotLimit();

  // Each attempt is a separate enqueued task so the queue slot is released
  // during backoff (backoff sleep no longer holds MAX_CONCURRENT slots).
  // Concurrent callers for the same key still coalesce via _inFlight.
  const promise = new Promise<MarketCandle[]>((resolve) => {
    let attempt = 0;
    let has429Retried = false;

    function runAttempt(): void {
      enqueueApiRequest(async (): Promise<void> => {
        const cached2 = getCached(key, upstreamSize);
        if (cached2) { resolve(cached2); return; }

        const slotStart = Date.now();
        await waitForSlot(slotLimit);
        const slotWaitMs = Date.now() - slotStart;
        const callStart = Date.now();
        const result = await activeProvider.fetchCandles(norm, interval as TfCode, upstreamSize);
        const callMs = Date.now() - callStart;
        debugCandles(norm, interval, attempt, slotWaitMs, 0, result.kind, callMs);

        if (result.kind === 'restricted') {
          _restrictedKeys.add(_restrictedKey(norm, interval));
          resolve([]);
          return;
        }
        if (result.kind === 'ok' && result.data.length > 0) {
          setCache(key, result.data, interval);
          resolve(result.data);
          return;
        }

        // 429: wait for the rolling window to reset, then retry once
        if (result.kind === 'error' && result.httpStatus === 429) {
          if (!has429Retried) {
            has429Retried = true;
            const windowMs = msToWait(_callTimestamps, Date.now(), slotLimit);
            setTimeout(runAttempt, Math.max(windowMs, 5_000) + 500);
          } else {
            resolve([]);
          }
          return;
        }

        const delay = retryDelay(attempt, RETRY_BACKOFFS_MS);
        if (delay !== null) {
          attempt++;
          setTimeout(runAttempt, delay);
        } else {
          resolve([]);
        }
      }, effectivePriority).catch(() => resolve([]));
    }

    runAttempt();
  });

  _inFlight.set(key, promise);
  promise.finally(() => _inFlight.delete(key));

  const full = await promise;
  return full.slice(0, outputsize);
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

// ── Three-role timeframe bias ────────────────────────────────

export async function getTriTimeframeBias(
  symbol: string,
  timeframes: TraderTimeframes,
): Promise<TriTimeframeBias> {
  const roles: TfRole[] = ["bias", "structure", "entry"];

  const results = await Promise.all(
    roles.map(async (role) => {
      const tf = timeframes[role];
      try {
        const candles = await fetchCandles(symbol, tf, 20);
        return analyzeBias(candles, tf);
      } catch {
        return { bias: "neutral" as const, confidence: 0, reason: "Error fetching data" };
      }
    }),
  );

  const [biasTfBias, structureTfBias, entryTfBias] = results;

  const perRole: TriTimeframeBias["perRole"] = {
    bias:      { tf: timeframes.bias,      direction: biasTfBias.bias,      confidence: biasTfBias.confidence,      reason: biasTfBias.reason },
    structure: { tf: timeframes.structure, direction: structureTfBias.bias, confidence: structureTfBias.confidence, reason: structureTfBias.reason },
    entry:     { tf: timeframes.entry,     direction: entryTfBias.bias,     confidence: entryTfBias.confidence,     reason: entryTfBias.reason },
  };

  // D = Σ(weight × sign(direction)) — ranges from -1.0 to +1.0
  const sign = (b: TimeframeBias["bias"]) => (b === "bullish" ? 1 : b === "bearish" ? -1 : 0);
  const D =
    ROLE_WEIGHT.bias      * sign(biasTfBias.bias) +
    ROLE_WEIGHT.structure * sign(structureTfBias.bias) +
    ROLE_WEIGHT.entry     * sign(entryTfBias.bias);

  let biasState: BiasState;
  if (D >= 0.70)       biasState = "Bullish Active";
  else if (D >= 0.30)  biasState = "Bullish Weakening";
  else if (D <= -0.70) biasState = "Bearish Active";
  else if (D <= -0.30) biasState = "Bearish Weakening";
  else                 biasState = "Neutral / Ranging";

  // confidence = Σ(weight × conf) × (0.6 + 0.4 × |D|) — penalises conflicting TFs
  const weightedConf =
    ROLE_WEIGHT.bias      * biasTfBias.confidence +
    ROLE_WEIGHT.structure * structureTfBias.confidence +
    ROLE_WEIGHT.entry     * entryTfBias.confidence;
  const confidence = Math.round(weightedConf * (0.6 + 0.4 * Math.abs(D)));

  return { biasState, confidence, timeframes, perRole };
}

// ── Real price levels from candle data ───────────────────────

export interface RealLevels {
  biasHigh: number;
  biasLow: number;
  recentBiasHigh: number;
  recentBiasLow: number;
  majorBiasHigh: number;
  majorBiasLow: number;
  structureHigh: number;
  structureLow: number;
  entryHigh: number;
  entryLow: number;
  biasTf: TfCode;
  structureTf: TfCode;
  entryTf: TfCode;
}

export async function getRealLevels(symbol: string, timeframes: TraderTimeframes): Promise<RealLevels | null> {
  try {
    // All three fetched at outputsize=20 so cache keys match getTriTimeframeBias (sym:tf:20).
    const [biasCandles, structureCandles, entryCandles] = await Promise.all([
      fetchCandles(symbol, timeframes.bias, 20, PRIORITY_LEVELS),
      fetchCandles(symbol, timeframes.structure, 20, PRIORITY_LEVELS),
      fetchCandles(symbol, timeframes.entry, 20, PRIORITY_LEVELS),
    ]);

    // Need at least 6 bias-TF candles (index 0 = forming, 1..5 = 5 closed)
    if (biasCandles.length < 6 || structureCandles.length < 5 || entryCandles.length < 5) return null;

    const prevBias = biasCandles[1];
    const recentBiasClosed = biasCandles.slice(1, 6);
    const majorBiasClosed = biasCandles.slice(1);
    const structureSlice = structureCandles.slice(0, 10);
    const entrySlice = entryCandles.slice(0, 10);

    return {
      biasHigh: prevBias.high,
      biasLow: prevBias.low,
      recentBiasHigh: Math.max(...recentBiasClosed.map((c) => c.high)),
      recentBiasLow: Math.min(...recentBiasClosed.map((c) => c.low)),
      majorBiasHigh: Math.max(...majorBiasClosed.map((c) => c.high)),
      majorBiasLow: Math.min(...majorBiasClosed.map((c) => c.low)),
      structureHigh: Math.max(...structureSlice.map((c) => c.high)),
      structureLow: Math.min(...structureSlice.map((c) => c.low)),
      entryHigh: Math.max(...entrySlice.map((c) => c.high)),
      entryLow: Math.min(...entrySlice.map((c) => c.low)),
      biasTf: timeframes.bias,
      structureTf: timeframes.structure,
      entryTf: timeframes.entry,
    };
  } catch {
    return null;
  }
}

