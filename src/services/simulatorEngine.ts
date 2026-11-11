// src/services/simulatorEngine.ts
// ─────────────────────────────────────────────────────────────
// Pure simulator engine. No React, no browser, no chart imports,
// no imports from journal/trades code.
// All timestamps are milliseconds since Unix epoch.
//
// Spread model (plan §2.10):
//   Long entry:  ask = entryClose + spread/2
//   Short entry: bid = entryClose - spread/2
//   Long exit:   bid = price - spread/2  (selling at bid)
//   Short exit:  ask = price + spread/2  (buying at ask)
//
// Stop-first rule: when a single 1m bar triggers both stop and target
// (long: low ≤ stop AND high ≥ target), the stop is assumed to have
// filled first. stopFirstAmbiguous is set true on the result.
// ─────────────────────────────────────────────────────────────

export interface Bar1m {
  timestamp: number; // ms
  open: number;
  high: number;
  low: number;
  close: number;
}

// ── Trade state ───────────────────────────────────────────────

export interface SimTrade {
  readonly direction: 'long' | 'short';
  /** Actual entry price after spread (ask for long, bid for short) */
  readonly entryPrice: number;
  /** Bar close used to compute the entry */
  readonly entryClose: number;
  readonly stopPrice: number;
  readonly targetPrice: number | undefined;
  readonly typicalSpread: number;
  readonly entryTimeMs: number;
  readonly status: 'open' | 'closed';
  readonly closePrice: number | undefined;
  readonly closeTimeMs: number | undefined;
  readonly closeReason: 'stop' | 'target' | 'manual' | 'end_of_window' | undefined;
  readonly stopFirstAmbiguous: boolean;
  readonly simulated: true;
}

export interface SimResult extends SimTrade {
  readonly status: 'closed';
  readonly closePrice: number;
  readonly closeTimeMs: number;
  readonly closeReason: 'stop' | 'target' | 'manual' | 'end_of_window';
  readonly pnlPrice: number;
  readonly pnlPct: number;
  /** Positive = profit; measured in R units where 1 R = initial stop distance */
  readonly rMultiple: number;
  readonly stopFirstAmbiguous: boolean;
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Convert a stop distance in pips to an absolute stop price.
 * @param entryPrice  The actual fill price (after spread)
 * @param stopPips    Distance from entry to stop in pips (positive)
 * @param pipSize     From tradeInstruments (e.g. 0.0001 for EURUSD)
 * @param direction   'long' or 'short'
 */
export function pipsToStopPrice(
  entryPrice: number,
  stopPips: number,
  pipSize: number,
  direction: 'long' | 'short',
): number {
  const dist = stopPips * pipSize;
  return direction === 'long' ? entryPrice - dist : entryPrice + dist;
}

/**
 * Convert a target distance in pips to an absolute target price.
 */
export function pipsToTargetPrice(
  entryPrice: number,
  targetPips: number,
  pipSize: number,
  direction: 'long' | 'short',
): number {
  const dist = targetPips * pipSize;
  return direction === 'long' ? entryPrice + dist : entryPrice - dist;
}

function exitPrice(price: number, spread: number, direction: 'long' | 'short'): number {
  // Long exits at bid (selling); short exits at ask (buying)
  return direction === 'long' ? price - spread / 2 : price + spread / 2;
}

// ── openTrade ─────────────────────────────────────────────────

export interface OpenTradeOpts {
  direction: 'long' | 'short';
  /** The bar's close price at the moment the user clicks "enter" */
  entryClose: number;
  /** Stop-loss as an absolute price */
  stopPrice: number;
  /** Take-profit as an absolute price (optional) */
  targetPrice?: number;
  /** From tradeInstruments.typicalSpread */
  typicalSpread: number;
  /** Bar timestamp (ms) */
  entryTimeMs: number;
}

export function openTrade(opts: OpenTradeOpts): SimTrade {
  const { direction, entryClose, stopPrice, targetPrice, typicalSpread, entryTimeMs } = opts;
  const entryPrice =
    direction === 'long'
      ? entryClose + typicalSpread / 2  // buy at ask
      : entryClose - typicalSpread / 2; // sell at bid

  return {
    direction,
    entryPrice,
    entryClose,
    stopPrice,
    targetPrice,
    typicalSpread,
    entryTimeMs,
    status: 'open',
    closePrice: undefined,
    closeTimeMs: undefined,
    closeReason: undefined,
    stopFirstAmbiguous: false,
    simulated: true,
  };
}

// ── evaluateBar ───────────────────────────────────────────────

/**
 * Walk one 1-minute bar against the trade. Returns an updated SimTrade.
 * If the trade is already closed, returns it unchanged.
 *
 * Priority (long):
 *   1. Bar opens at or beyond stop (gap) → fill at open (worse fill)
 *   2. Bar opens at or beyond target (gap) → fill at open (better fill)
 *   3. Within-bar: low ≤ stop AND high ≥ target → stop first, flag = true
 *   4. Within-bar: low ≤ stop → stop hit at stop price
 *   5. Within-bar: high ≥ target → target hit at target price
 *
 * Short direction is mirrored.
 */
export function evaluateBar(trade: SimTrade, bar: Bar1m): SimTrade {
  if (trade.status === 'closed') return trade;

  const { direction, stopPrice, targetPrice, typicalSpread } = trade;
  const hasTarget = targetPrice !== undefined;

  function close(
    price: number,
    reason: SimTrade['closeReason'],
    ambiguous = false,
  ): SimTrade {
    return {
      ...trade,
      status: 'closed',
      closePrice: exitPrice(price, typicalSpread, direction),
      closeTimeMs: bar.timestamp,
      closeReason: reason,
      stopFirstAmbiguous: ambiguous,
    };
  }

  if (direction === 'long') {
    // 1. Gap through stop: bar opens below stop
    if (bar.open <= stopPrice) {
      return close(bar.open, 'stop');
    }
    // 2. Gap through target
    if (hasTarget && bar.open >= targetPrice!) {
      return close(bar.open, 'target');
    }
    // 3. Stop-first ambiguity: both levels touched within the bar
    if (hasTarget && bar.low <= stopPrice && bar.high >= targetPrice!) {
      return close(stopPrice, 'stop', true);
    }
    // 4. Stop only
    if (bar.low <= stopPrice) {
      return close(stopPrice, 'stop');
    }
    // 5. Target only
    if (hasTarget && bar.high >= targetPrice!) {
      return close(targetPrice!, 'target');
    }
  } else {
    // short ─ mirror of long
    // 1. Gap through stop: bar opens above stop
    if (bar.open >= stopPrice) {
      return close(bar.open, 'stop');
    }
    // 2. Gap through target
    if (hasTarget && bar.open <= targetPrice!) {
      return close(bar.open, 'target');
    }
    // 3. Stop-first ambiguity
    if (hasTarget && bar.high >= stopPrice && bar.low <= targetPrice!) {
      return close(stopPrice, 'stop', true);
    }
    // 4. Stop only
    if (bar.high >= stopPrice) {
      return close(stopPrice, 'stop');
    }
    // 5. Target only
    if (hasTarget && bar.low <= targetPrice!) {
      return close(targetPrice!, 'target');
    }
  }

  return trade; // bar did not trigger any exit
}

// ── Manual and end-of-window closes ──────────────────────────

function closeWith(
  trade: SimTrade,
  bar: Bar1m,
  reason: 'manual' | 'end_of_window',
): SimTrade {
  if (trade.status === 'closed') return trade;
  return {
    ...trade,
    status: 'closed',
    closePrice: exitPrice(bar.close, trade.typicalSpread, trade.direction),
    closeTimeMs: bar.timestamp,
    closeReason: reason,
    stopFirstAmbiguous: false,
  };
}

/** Close at the current bar's close price (manual exit). */
export function closeManual(trade: SimTrade, bar: Bar1m): SimTrade {
  return closeWith(trade, bar, 'manual');
}

/** Close at the current bar's close price at end of replay window. */
export function closeAtEndOfWindow(trade: SimTrade, bar: Bar1m): SimTrade {
  return closeWith(trade, bar, 'end_of_window');
}

// ── computeResult ─────────────────────────────────────────────

/**
 * Attach PnL and R-multiple to a closed trade.
 * Throws if trade.status !== 'closed'.
 */
export function computeResult(trade: SimTrade): SimResult {
  if (trade.status !== 'closed' || trade.closePrice === undefined) {
    throw new Error('computeResult called on an open trade');
  }

  const { direction, entryPrice, stopPrice, closePrice } = trade;

  // Initial stop distance (in price) — includes spread effect since entryPrice is after spread
  const stopDistance =
    direction === 'long'
      ? entryPrice - stopPrice   // positive for a valid long setup
      : stopPrice - entryPrice;  // positive for a valid short setup

  const rawPnl =
    direction === 'long'
      ? closePrice - entryPrice
      : entryPrice - closePrice;

  const rMultiple = stopDistance > 0 ? rawPnl / stopDistance : 0;
  const pnlPct = entryPrice !== 0 ? (rawPnl / entryPrice) * 100 : 0;

  return {
    ...trade,
    status: 'closed',
    closePrice: trade.closePrice!,
    closeTimeMs: trade.closeTimeMs!,
    closeReason: trade.closeReason!,
    pnlPrice: rawPnl,
    pnlPct,
    rMultiple,
    stopFirstAmbiguous: trade.stopFirstAmbiguous,
  };
}

// ── runAll ────────────────────────────────────────────────────

/**
 * Walk the trade forward through all provided 1-minute bars.
 * Bars with timestamp < trade.entryTimeMs are skipped.
 * If the trade is still open after all bars, it is closed at end of window.
 * Returns a fully computed SimResult.
 */
export function runAll(trade: SimTrade, bars1m: Bar1m[]): SimResult {
  let current = trade;

  for (const bar of bars1m) {
    if (bar.timestamp < trade.entryTimeMs) continue;
    if (current.status === 'closed') break;
    current = evaluateBar(current, bar);
  }

  if (current.status === 'open') {
    const lastBar = bars1m[bars1m.length - 1];
    if (lastBar) {
      current = closeAtEndOfWindow(current, lastBar);
    } else {
      throw new Error('runAll: empty bar array');
    }
  }

  return computeResult(current);
}
