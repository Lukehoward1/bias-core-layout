// src/services/replayAggregator.ts
// ─────────────────────────────────────────────────────────────
// Pure replay aggregator. Builds display-interval candles from
// 1-minute source bars up to a cursor — no future-leak.
//
// NO alias imports. NO browser dependencies. Pure TypeScript so
// the module can be imported from Node check scripts (tsx) and
// from the browser identically.
//
// Contract (per plan §2.9):
//   - sourceBars: oldest-first 1-minute MarketCandle-compatible points
//   - intervalMinutes: target display interval in minutes (1, 5, 15, 60, 240, 1440, 10080)
//   - cursorMs: wall-clock cursor; no bar with timestamp > cursor is read
//   - Boundaries aligned to UTC epoch for intraday/daily; week boundary = Monday 00:00 UTC
//
// Open Question Q8: FMP daily cutoff timezone is unconfirmed.
// If the daily close is not UTC midnight (e.g. NY 17:00 FX),
// the weekly-boundary function below must be offset by that cutoff.
// Stage 1 assumes UTC midnight; Stage 7 is the confirmation point.
// ─────────────────────────────────────────────────────────────

export interface AggregatorBar {
  timestamp: number; // ms since epoch (bar start)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const MIN_MS = 60_000;
const HOUR_MS = 60 * MIN_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
// 1970-01-01 was a Thursday; the Monday that starts that week is 1969-12-29,
// which is 3 days earlier → -259_200_000 ms.
// Aligning week starts to Monday 00:00 UTC means subtracting this offset before
// flooring by WEEK_MS and adding it back.
const MONDAY_EPOCH_OFFSET_MS = -3 * DAY_MS;

/**
 * Returns the bar-start timestamp (ms) for the UTC-aligned window
 * that contains `ts` for an interval of `intervalMinutes`.
 *
 * - intervalMinutes < 1440 (intraday) → floor to interval boundary from UTC epoch
 * - intervalMinutes === 1440 (daily)  → floor to UTC midnight
 * - intervalMinutes === 10080 (weekly) → floor to Monday 00:00 UTC
 */
export function floorToBoundary(ts: number, intervalMinutes: number): number {
  if (intervalMinutes <= 0) throw new Error('intervalMinutes must be > 0');

  if (intervalMinutes === 10080) {
    // Weekly: align to Monday 00:00 UTC. See MONDAY_EPOCH_OFFSET_MS note above.
    return Math.floor((ts - MONDAY_EPOCH_OFFSET_MS) / WEEK_MS) * WEEK_MS + MONDAY_EPOCH_OFFSET_MS;
  }

  if (intervalMinutes === 1440) {
    // Daily: UTC midnight
    const d = new Date(ts);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  const intervalMs = intervalMinutes * MIN_MS;
  return Math.floor(ts / intervalMs) * intervalMs;
}

/**
 * Aggregates 1-minute source bars into display-interval bars up to the cursor.
 * - No bar with timestamp > cursorMs is read.
 * - The last returned bar is partial by design (OHLC accumulated so far).
 * - Source bars should be strictly ascending by timestamp.
 */
export function aggregate(
  sourceBars1m: readonly AggregatorBar[],
  intervalMinutes: number,
  cursorMs: number,
): AggregatorBar[] {
  if (intervalMinutes <= 0) throw new Error('intervalMinutes must be > 0');
  if (sourceBars1m.length === 0) return [];

  const out: AggregatorBar[] = [];
  let current: AggregatorBar | null = null;
  let currentBoundary = -Infinity;

  for (const b of sourceBars1m) {
    if (b.timestamp > cursorMs) break; // no look-ahead

    const boundary = floorToBoundary(b.timestamp, intervalMinutes);

    if (boundary !== currentBoundary) {
      if (current) out.push(current);
      current = {
        timestamp: boundary,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume ?? 0,
      };
      currentBoundary = boundary;
    } else if (current) {
      if (b.high > current.high) current.high = b.high;
      if (b.low < current.low) current.low = b.low;
      current.close = b.close;
      if (b.volume !== undefined) current.volume = (current.volume ?? 0) + b.volume;
    }
  }

  if (current) out.push(current);
  return out;
}

/**
 * Daily → Weekly aggregation entry point for the FMP adapter contract (§2.1).
 * When a provider silently downgrades `1week` to daily rows, the adapter calls
 * this to build weekly bars. Weekly boundary = Monday 00:00 UTC per Stage 1 assumption.
 *
 * `dailyBars` must be strictly ascending by timestamp. Bars with timestamps
 * past `cursorMs` are ignored (default: infinity → use all).
 */
export function aggregateDailyToWeekly(
  dailyBars: readonly AggregatorBar[],
  cursorMs: number = Number.POSITIVE_INFINITY,
): AggregatorBar[] {
  if (dailyBars.length === 0) return [];

  const out: AggregatorBar[] = [];
  let current: AggregatorBar | null = null;
  let currentBoundary = -Infinity;

  for (const d of dailyBars) {
    if (d.timestamp > cursorMs) break;

    const boundary = floorToBoundary(d.timestamp, 10080);

    if (boundary !== currentBoundary) {
      if (current) out.push(current);
      current = {
        timestamp: boundary,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume ?? 0,
      };
      currentBoundary = boundary;
    } else if (current) {
      if (d.high > current.high) current.high = d.high;
      if (d.low < current.low) current.low = d.low;
      current.close = d.close;
      if (d.volume !== undefined) current.volume = (current.volume ?? 0) + d.volume;
    }
  }

  if (current) out.push(current);
  return out;
}
