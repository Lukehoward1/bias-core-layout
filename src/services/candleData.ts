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

// ── Rolling-window rate limiter ───────────────────────────────
// At most TS_MAX_PER_MIN upstream timeseries calls in any rolling 60 s.
// Leaves 3 req/min headroom for the quote poller on the 8 req/min Basic plan.

export const TS_MAX_PER_MIN = 5;
const _callTimestamps: number[] = [];

/**
 * Pure: returns the ms to wait before the next call can be issued without
 * exceeding maxPerMin in any rolling 60 s window. Exported for tests.
 */
export function msToWait(timestamps: number[], nowMs: number, maxPerMin: number): number {
  const recent = timestamps.filter((t) => nowMs - t < 60_000);
  if (recent.length < maxPerMin) return 0;
  const sorted = [...recent].sort((a, b) => a - b);
  return Math.max(0, sorted[recent.length - maxPerMin] + 60_000 - nowMs);
}

/** Claims one rate-limit slot; waits if the rolling window is full. */
async function waitForSlot(): Promise<void> {
  for (;;) {
    const now = Date.now();
    const wait = msToWait(_callTimestamps, now, TS_MAX_PER_MIN);
    if (wait <= 0) {
      _callTimestamps.push(now);
      // Prune entries older than 2 minutes (safely past the 60 s window)
      while (_callTimestamps.length > 0 && now - _callTimestamps[0] > 120_000) {
        _callTimestamps.shift();
      }
      return;
    }
    await new Promise<void>((r) => setTimeout(r, Math.min(wait + 50, 2_000)));
  }
}

// ── Request queue ─────────────────────────────────────────────
// Limits concurrent Twelve Data fetches to MAX_CONCURRENT. Lower = gentler on
// the shared 8-req/min Basic key. Higher-priority tasks (currently-viewed
// asset) are inserted at the front.

const MAX_CONCURRENT = 2;
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
// In-flight promise resolves to the FULL upstream array (STANDARD_SIZE);
// callers slice to their requested outputsize. One upstream call serves all.
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

export const WHITELIST_SYMBOLS = TRADE_INSTRUMENTS.map((i) => i.symbol);

const CANDLE_API_WHITELIST = new Set(WHITELIST_SYMBOLS);

export function isBiasAvailable(symbol: string): boolean {
  return CANDLE_API_WHITELIST.has(normalizeSymbol(symbol));
}

// ── Fetch ────────────────────────────────────────────────────

// Retry backoffs: 8 s then 20 s. Each retry also waits for a free rate-limit slot.
const RETRY_BACKOFFS_MS = [8_000, 20_000];

export async function fetchCandles(
  symbol: string,
  interval: string,
  outputsize: number = 10,
): Promise<MarketCandle[]> {
  const norm = normalizeSymbol(symbol);

  if (!CANDLE_API_WHITELIST.has(norm)) return [];
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
  const priority = _prioritySymbol === norm ? 1 : 0;

  const promise = _enqueue(async (): Promise<MarketCandle[]> => {
    // Another request may have populated the cache while we waited in the queue.
    const cached2 = getCached(key, upstreamSize);
    if (cached2) return cached2;

    // Up to 3 attempts: attempt 0 fires immediately after claiming a slot;
    // retries wait at least RETRY_BACKOFFS_MS[i] before claiming the next slot.
    for (let attempt = 0; attempt <= RETRY_BACKOFFS_MS.length; attempt++) {
      if (attempt > 0) {
        await new Promise<void>((r) => setTimeout(r, RETRY_BACKOFFS_MS[attempt - 1]));
      }
      await waitForSlot();
      const result = await activeProvider.fetchCandles(norm, interval as TfCode, upstreamSize);
      if (result.kind === "ok" && result.data.length > 0) {
        setCache(key, result.data, interval);
        return result.data;
      }
    }
    return [];
  }, priority).finally(() => {
    _inFlight.delete(key);
  });

  _inFlight.set(key, promise);
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
      fetchCandles(symbol, timeframes.bias, 20),
      fetchCandles(symbol, timeframes.structure, 20),
      fetchCandles(symbol, timeframes.entry, 20),
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

