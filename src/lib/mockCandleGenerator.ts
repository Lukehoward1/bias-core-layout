// src/lib/mockCandleGenerator.ts
// ─────────────────────────────────────────────────────────────
// Deterministic mock candle + quote generator for dev-only use.
// Zero network calls; feeds the same pipeline as live data.
//
// Guard: MOCK_CANDLES_ENABLED is false in every production build.
// Vite replaces import.meta.env.DEV with the boolean literal `false`
// during `vite build`, so the entire PRNG + generator body becomes
// unreachable dead code and is tree-shaken by the minifier.
//
// No value imports from marketData.ts — only type imports — so this
// module can be safely imported BY marketData.ts without a circular dep.
//
// Cross-timeframe coherence
// ─────────────────────────
// All timeframes share ONE underlying 1-minute base series seeded only
// on the symbol (not the interval). The base is generated newest-first
// and anchored: bar[0].close = profile.basePrice for all symbols. This
// means every timeframe's final (most-recent) close equals the same
// price, which also drives the mock quote — header and all chart
// timeframes always agree.
//
// Higher timeframes are obtained by OHLC-aggregation of the 1m base:
//   open  = first 1m bar's open
//   high  = max of all 1m highs in the period
//   low   = min of all 1m lows in the period
//   close = last 1m bar's close
// Volume is 0 (Twelve Data returns 0 for most FX anyway).
// ─────────────────────────────────────────────────────────────

import type { MarketCandle, MarketQuote } from '@/services/marketData';

// Only true when running `vite dev` AND VITE_MOCK_CANDLES=true in .env.local.
export const MOCK_CANDLES_ENABLED: boolean =
  import.meta.env.DEV === true && import.meta.env.VITE_MOCK_CANDLES === 'true';

// ── Local helpers ─────────────────────────────────────────────
const normSym = (s: string): string => s.toUpperCase().replace(/[/ ]/g, '').trim();
const mockRoundSmart = (v: number): number => Number.isFinite(v) ? Number(v.toPrecision(7)) : 0;

// ── Seeded PRNG (mulberry32) ──────────────────────────────────
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function symbolSeed(symbol: string, salt: string): number {
  const str = `${symbol}:${salt}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// ── Price profile per instrument ──────────────────────────────
interface PriceProfile {
  basePrice: number;
  pipSize: number;
  volPips: number;
}

const PROFILES: Record<string, PriceProfile> = {
  EURUSD: { basePrice: 1.0850, pipSize: 0.0001, volPips: 15 },
  GBPUSD: { basePrice: 1.2650, pipSize: 0.0001, volPips: 20 },
  USDJPY: { basePrice: 149.50, pipSize: 0.01,   volPips: 20 },
  USDCHF: { basePrice: 0.8950, pipSize: 0.0001, volPips: 15 },
  AUDUSD: { basePrice: 0.6550, pipSize: 0.0001, volPips: 15 },
  USDCAD: { basePrice: 1.3650, pipSize: 0.0001, volPips: 15 },
  NZDUSD: { basePrice: 0.6050, pipSize: 0.0001, volPips: 15 },
  EURGBP: { basePrice: 0.8580, pipSize: 0.0001, volPips: 10 },
  EURJPY: { basePrice: 162.00, pipSize: 0.01,   volPips: 25 },
  GBPJPY: { basePrice: 189.00, pipSize: 0.01,   volPips: 30 },
  XAUUSD: { basePrice: 1980.0, pipSize: 0.01,   volPips: 150 },
  NAS100: { basePrice: 17500,  pipSize: 1,       volPips: 50 },
  US30:   { basePrice: 38500,  pipSize: 1,       volPips: 80 },
  GER40:  { basePrice: 18000,  pipSize: 1,       volPips: 60 },
  UK100:  { basePrice: 7800,   pipSize: 1,       volPips: 40 },
};

const INTERVAL_SECONDS: Record<string, number> = {
  '1min': 60, '5min': 300, '15min': 900,
  '1h': 3600, '4h': 14400, '1day': 86400,
};

// How many 1m bars make up one bar of each interval.
const INTERVAL_1M_MULTIPLIER: Record<string, number> = {
  '1min': 1, '5min': 5, '15min': 15, '1h': 60, '4h': 240, '1day': 1440,
};

interface BaseOhlc { open: number; high: number; low: number; close: number; }

/**
 * Generate `count` 1-minute candles NEWEST-FIRST, anchored so bar[0].close
 * always equals profile.basePrice regardless of `count`. Every call with the
 * same symbol therefore shares the same most-recent bars: short counts are a
 * suffix of longer counts, ensuring all timeframes converge on the same final
 * close price.
 *
 * The walk goes backward in time: at each step, `price` is the current bar's
 * close (starting at basePrice), and the bar's open is `price − drift` (the
 * previous bar in time). After reversal the array is a coherent oldest-first
 * OHLC series with no open/close gaps between consecutive bars.
 *
 * 1m volatility is scaled to match H1 ranges after aggregation:
 *   barVol = volPips × pipSize × √(60 s / 3600 s) = H1_range / √60
 * So √60 consecutive 1m bars aggregate to roughly the right H1 range.
 */
function generate1mNewestFirst(symbol: string, count: number): BaseOhlc[] {
  const prof = PROFILES[symbol] ?? { basePrice: 1.0, pipSize: 0.0001, volPips: 15 };
  // 1m vol = H1 vol / sqrt(60) so aggregated H1 range ≈ H1 vol target
  const barVol = prof.volPips * prof.pipSize * Math.sqrt(60 / 3600);

  const rand = mulberry32(symbolSeed(symbol, 'base'));

  let price = prof.basePrice; // most-recent close anchored at basePrice
  let regimeDir = rand() > 0.5 ? 1 : -1;
  let regimeTtl = Math.floor(rand() * 15) + 8;

  const bars: BaseOhlc[] = [];
  for (let i = 0; i < count; i++) {
    if (--regimeTtl <= 0) {
      regimeDir = -regimeDir;
      regimeTtl = Math.floor(rand() * 15) + 8;
    }

    // Drift in reverse-time direction: 30% regime bias + 70% noise
    const drift = regimeDir * barVol * 0.3 + (rand() - 0.5) * barVol * 1.4;
    const close = price;
    const open  = price - drift; // previous bar's close in forward time

    const bodyTop    = Math.max(open, close);
    const bodyBottom = Math.min(open, close);
    const wickExtra  = barVol * rand() * 0.6;

    // ~12% of bars are wick sweeps
    const isSweep = rand() < 0.12;
    let high: number;
    let low: number;
    if (isSweep) {
      if (rand() > 0.5) {
        high = bodyTop    + barVol * (1.5 + rand() * 0.5);
        low  = bodyBottom - wickExtra * 0.3;
      } else {
        high = bodyTop    + wickExtra * 0.3;
        low  = bodyBottom - barVol * (1.5 + rand() * 0.5);
      }
    } else {
      high = bodyTop    + wickExtra;
      low  = bodyBottom - wickExtra;
    }

    bars.push({
      open,
      high: Math.max(high, open, close),
      low:  Math.min(low,  open, close),
      close,
    });
    // Walk one step further back in time
    price = open;
  }

  return bars; // bars[0] = most recent (close = basePrice); bars[count-1] = oldest
}

/**
 * Aggregate an oldest-first 1m series into a larger interval.
 * Caller must pass exactly count × multiplier bars.
 */
function aggregateOhlc(barsOldestFirst: BaseOhlc[], multiplier: number, count: number): BaseOhlc[] {
  const result: BaseOhlc[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * multiplier;
    const end   = start + multiplier;
    let hi = -Infinity;
    let lo =  Infinity;
    for (let j = start; j < end; j++) {
      if (barsOldestFirst[j].high > hi) hi = barsOldestFirst[j].high;
      if (barsOldestFirst[j].low  < lo) lo = barsOldestFirst[j].low;
    }
    result.push({
      open:  barsOldestFirst[start].open,
      high:  hi,
      low:   lo,
      close: barsOldestFirst[end - 1].close,
    });
  }
  return result; // oldest-first, length = count
}

/**
 * Generate `count` deterministic mock candles for the given symbol+interval.
 * Output is newest-first (index 0 = forming bar), matching fetchCandles behaviour.
 *
 * All intervals are derived from the same underlying 1m base series so the
 * forming bar's close is identical across 1m/5m/15m/1H/4H/1D for a given
 * symbol, and stable across page reloads.
 */
export function generateMockCandles(
  symbol: string,
  interval: string,
  count = 150,
): MarketCandle[] {
  const norm     = normSym(symbol);
  const stepSec  = INTERVAL_SECONDS[interval]       ?? 3600;
  const mult     = INTERVAL_1M_MULTIPLIER[interval] ?? 60;
  const count1m  = count * mult;

  // Generate 1m base newest-first, reverse to oldest-first for aggregation
  const newestFirst  = generate1mNewestFirst(norm, count1m);
  const oldestFirst  = newestFirst.slice().reverse();

  // Aggregate (or use directly for 1m)
  const intervalBars = mult === 1 ? oldestFirst : aggregateOhlc(oldestFirst, mult, count);

  // Compose MarketCandle[] newest-first (index 0 = forming bar)
  const nowSec      = Math.floor(Date.now() / 1000);
  const formingStart = nowSec - (nowSec % stepSec);

  const candles: MarketCandle[] = [];
  for (let i = 0; i < count; i++) {
    const p = intervalBars[count - 1 - i]; // newest first
    candles.push({
      symbol:    norm,
      timeframe: interval,
      timestamp: (formingStart - i * stepSec) * 1000,
      open:      mockRoundSmart(p.open),
      high:      mockRoundSmart(p.high),
      low:       mockRoundSmart(p.low),
      close:     mockRoundSmart(p.close),
      volume:    0,
    });
  }
  return candles; // index 0 = forming bar (newest)
}

/**
 * Derive a synthetic MarketQuote anchored to the same final close as the charts.
 * Adds a tiny slow sine drift (±0.5 pip, ~30 s period) so the ticker animates,
 * but stays within fractions of a pip of the chart's last close.
 */
export function generateMockQuote(symbol: string): MarketQuote {
  const norm = normSym(symbol);
  const prof = PROFILES[norm] ?? { basePrice: 1.0, pipSize: 0.0001, volPips: 15 };

  // h1 candles share the same final close as all other timeframes.
  const candles  = generateMockCandles(norm, '1h', 150);
  const baseClose = candles.length > 0 ? candles[0].close  : prof.basePrice;
  const prevClose = candles.length > 1 ? candles[1].close  : baseClose;

  // Symbol-specific phase so each instrument ticks on its own cycle.
  const phase = (symbolSeed(norm, 'phase') % 1000) / 1000 * Math.PI * 2;
  const drift = Math.sin(Date.now() / 30000 + phase) * prof.pipSize * 0.5;
  const last  = baseClose + drift;

  const change = last - prevClose;
  const hs     = prof.pipSize * 0.5;

  return {
    symbol:         norm,
    providerSymbol: norm,
    last:           mockRoundSmart(last),
    bid:            mockRoundSmart(last - hs),
    ask:            mockRoundSmart(last + hs),
    spread:         mockRoundSmart(hs * 2),
    previousClose:  mockRoundSmart(prevClose),
    change:         mockRoundSmart(change),
    changePercent:  Number.isFinite(prevClose) && prevClose !== 0
      ? Number(((change / prevClose) * 100).toFixed(2))
      : 0,
    direction:  change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
    timestamp:  Date.now(),
    source:     'mock',
  };
}
