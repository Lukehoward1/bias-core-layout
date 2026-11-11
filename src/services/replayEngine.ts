// src/services/replayEngine.ts
// ─────────────────────────────────────────────────────────────
// Pure replay engine. No React, no browser, no chart imports.
// All timestamps are milliseconds since Unix epoch.
//
// Three exports:
//   projectBars     — build display-interval bars up to a cursor
//   replayReducer   — pure state reducer for replay controls
//   visiblePivots   — swing pivots visible at the current cursor
// ─────────────────────────────────────────────────────────────

import { aggregate, type AggregatorBar } from './replayAggregator';

export type { AggregatorBar };

// ── Replay state ──────────────────────────────────────────────

export interface ReplayState {
  cursorMs: number;
  playing: boolean;
  speed: 1 | 2 | 5 | 10;
  startMs: number;
  endMs: number;
}

export type ReplayAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'setSpeed'; speed: 1 | 2 | 5 | 10 }
  /** Advance cursor by n 1-minute bars; negative n moves backward. */
  | { type: 'step'; n: number }
  /** Advance cursor by elapsedMs × speed; called each animation frame. */
  | { type: 'tick'; elapsedMs: number }
  | { type: 'jumpTo'; ts: number };

export interface SwingPivot {
  timestamp: number; // bar start (ms)
  price: number;
  direction: 'high' | 'low';
}

const MIN_1M_MS = 60_000;

// ── projectBars ───────────────────────────────────────────────

/**
 * Build boundary-aligned display bars from 1-minute source bars up to cursorMs.
 * Delegates to replayAggregator.aggregate — no look-ahead guaranteed there.
 * The last returned bar is partial by design (OHLC accumulated so far in its window).
 * Works for any intervalMinutes: 1, 5, 15, 60, 240, 1440, 10080.
 */
export function projectBars(
  sourceBars1m: readonly AggregatorBar[],
  cursorMs: number,
  intervalMinutes: number,
): AggregatorBar[] {
  return aggregate(sourceBars1m, intervalMinutes, cursorMs);
}

// ── Reducer ───────────────────────────────────────────────────

export function createInitialState(
  startMs: number,
  endMs: number,
  speed: 1 | 2 | 5 | 10 = 1,
): ReplayState {
  return { cursorMs: startMs, playing: false, speed, startMs, endMs };
}

export function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'play':
      // Already at end → no-op
      if (state.cursorMs >= state.endMs) return state;
      return { ...state, playing: true };

    case 'pause':
      return { ...state, playing: false };

    case 'setSpeed':
      return { ...state, speed: action.speed };

    case 'step': {
      const next = Math.max(
        state.startMs,
        Math.min(state.cursorMs + action.n * MIN_1M_MS, state.endMs),
      );
      return {
        ...state,
        cursorMs: next,
        // Auto-pause when stepping to or past endMs
        playing: next >= state.endMs ? false : state.playing,
      };
    }

    case 'tick': {
      if (!state.playing) return state;
      const advance = action.elapsedMs * state.speed;
      const next = Math.min(state.cursorMs + advance, state.endMs);
      return {
        ...state,
        cursorMs: next,
        // Auto-pause when reaching the end
        playing: next < state.endMs,
      };
    }

    case 'jumpTo': {
      const clamped = Math.max(state.startMs, Math.min(action.ts, state.endMs));
      return { ...state, cursorMs: clamped };
    }

    default:
      return state;
  }
}

// ── visiblePivots ─────────────────────────────────────────────

function computeAllPivots(
  bars: readonly AggregatorBar[],
  n: number,
): Array<{ timestamp: number; price: number; direction: 'high' | 'low' }> {
  const result: Array<{ timestamp: number; price: number; direction: 'high' | 'low' }> = [];
  if (n < 1 || bars.length < 2 * n + 1) return result;

  const limit = bars.length - n; // last N bars can't be confirmed (no right-side bars yet)

  for (let i = n; i < limit; i++) {
    const bar = bars[i];

    // Swing high: bar.high strictly greater than all N neighbours on each side
    let isHigh = true;
    for (let j = i - n; j < i && isHigh; j++) {
      if (bars[j].high >= bar.high) isHigh = false;
    }
    if (isHigh) {
      for (let j = i + 1; j <= i + n && isHigh; j++) {
        if (bars[j].high >= bar.high) isHigh = false;
      }
    }

    // Swing low: bar.low strictly less than all N neighbours on each side
    let isLow = true;
    for (let j = i - n; j < i && isLow; j++) {
      if (bars[j].low <= bar.low) isLow = false;
    }
    if (isLow) {
      for (let j = i + 1; j <= i + n && isLow; j++) {
        if (bars[j].low <= bar.low) isLow = false;
      }
    }

    if (isHigh) result.push({ timestamp: bar.timestamp, price: bar.high, direction: 'high' });
    if (isLow) result.push({ timestamp: bar.timestamp, price: bar.low, direction: 'low' });
  }

  return result;
}

/**
 * Returns swing pivots from displayBars that are visible at cursorMs.
 *
 * A pivot at bar.timestamp is visible once the N right-side confirmation bars
 * have elapsed: cursorMs >= bar.timestamp + n * intervalMs.
 * This prevents look-ahead during replay (§2.8).
 *
 * @param displayBars  Already-projected bars for the display interval (oldest-first)
 * @param n            Pivot window (3 for sub-hour, 5 for 1H+)
 * @param cursorMs     Current replay cursor (ms)
 * @param intervalMinutes  Display interval in minutes
 */
export function visiblePivots(
  displayBars: readonly AggregatorBar[],
  n: number,
  cursorMs: number,
  intervalMinutes: number,
): SwingPivot[] {
  const allPivots = computeAllPivots(displayBars, n);
  const confirmMs = n * intervalMinutes * MIN_1M_MS;
  return allPivots.filter((p) => cursorMs >= p.timestamp + confirmMs);
}
