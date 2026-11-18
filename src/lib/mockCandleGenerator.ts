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
// ─────────────────────────────────────────────────────────────

import type { MarketCandle, MarketQuote } from '@/services/marketData';

// Only true when running `vite dev` AND VITE_MOCK_CANDLES=true in .env.local.
export const MOCK_CANDLES_ENABLED: boolean =
  import.meta.env.DEV === true && import.meta.env.VITE_MOCK_CANDLES === 'true';

// ── Local helpers (mirror marketData.ts functions; no value import) ───────────
// Keeps this module free of runtime circular dependencies.
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

function symbolSeed(symbol: string, interval: string): number {
  const str = `${symbol}:${interval}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// ── Price profile per instrument ──────────────────────────────
// basePrice: realistic anchor; volPips: typical h1 bar range in pips.
// Volatility is scaled by sqrt(interval/h1) for other timeframes.
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

/**
 * Generate `count` deterministic mock candles for the given symbol+interval.
 * Output is newest-first (index 0 = forming bar), matching fetchCandles behaviour.
 * The random walk uses periodic regime changes so the bias engine sees varied
 * signals across different timeframes — not a single-direction drift.
 */
export function generateMockCandles(
  symbol: string,
  interval: string,
  count = 150,
): MarketCandle[] {
  const norm = normSym(symbol);
  const prof = PROFILES[norm] ?? { basePrice: 1.0, pipSize: 0.0001, volPips: 15 };
  const stepSec = INTERVAL_SECONDS[interval] ?? 3600;

  // Scale bar volatility by sqrt(interval / 1h) so longer TFs have wider bars.
  const volScale = Math.sqrt(stepSec / 3600);
  const barVol = prof.volPips * prof.pipSize * volScale;

  const rand = mulberry32(symbolSeed(norm, interval));

  // ── Random walk oldest-first ──────────────────────────────
  // Regime: biased direction that flips every 8–22 bars, so the most
  // recent bars carry a clear structure signal for the bias engine.
  const rawBars: Array<{ open: number; high: number; low: number; close: number }> = [];
  let price = prof.basePrice;
  let regimeDir = rand() > 0.5 ? 1 : -1;
  let regimeTtl = Math.floor(rand() * 15) + 8;

  for (let i = 0; i < count; i++) {
    if (--regimeTtl <= 0) {
      regimeDir = -regimeDir;
      regimeTtl = Math.floor(rand() * 15) + 8;
    }

    // Drift: 30% regime bias + 70% noise
    const drift = regimeDir * barVol * 0.3 + (rand() - 0.5) * barVol * 1.4;
    const open  = price;
    const close = open + drift;

    const bodyTop    = Math.max(open, close);
    const bodyBottom = Math.min(open, close);
    const wickExtra  = barVol * rand() * 0.6;

    // ~12% of bars are wick sweeps: wick extends 1.5–2× barVol beyond the body,
    // then closes back inside. These feed the wick-rejection bias rules.
    const isSweep = rand() < 0.12;
    let high: number;
    let low:  number;
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

    rawBars.push({
      open,
      high: Math.max(high, open, close),
      low:  Math.min(low,  open, close),
      close,
    });
    price = close;
  }

  // ── Compose MarketCandle[] newest-first ───────────────────
  // The forming bar (index 0) starts at the most recent interval boundary.
  const nowSec = Math.floor(Date.now() / 1000);
  const formingStart = nowSec - (nowSec % stepSec);

  const candles: MarketCandle[] = [];
  for (let i = 0; i < count; i++) {
    // rawBars[count-1] = newest (forming); rawBars[0] = oldest
    const p = rawBars[count - 1 - i];
    candles.push({
      symbol: norm,
      timeframe: interval,
      timestamp: (formingStart - i * stepSec) * 1000, // ms, matching live adapter
      open:  p.open,
      high:  p.high,
      low:   p.low,
      close: p.close,
      volume: 0,
    });
  }
  return candles; // index 0 = forming bar (newest)
}

/**
 * Derive a synthetic MarketQuote from the h1 mock candles for the given symbol.
 * Price = forming bar close + tiny slow sine drift (±0.5 pip, ~30 s period).
 * Consistent with the chart: the same h1 candle walk drives both.
 */
export function generateMockQuote(symbol: string): MarketQuote {
  const norm = normSym(symbol);
  const prof = PROFILES[norm] ?? { basePrice: 1.0, pipSize: 0.0001, volPips: 15 };

  // Use h1 as the reference interval so the quote is anchored to the h1 chart.
  const candles = generateMockCandles(norm, '1h', 150);
  const baseClose = candles.length > 0 ? candles[0].close  : prof.basePrice;
  const prevClose = candles.length > 1 ? candles[1].close  : baseClose;

  // Symbol-specific phase so each instrument ticks on its own cycle.
  const phase = (symbolSeed(norm, 'phase') % 1000) / 1000 * Math.PI * 2;
  const drift = Math.sin(Date.now() / 30000 + phase) * prof.pipSize * 0.5;
  const last  = baseClose + drift;

  const change     = last - prevClose;
  const hs         = prof.pipSize * 0.5; // typical half-spread ≈ 0.5 pips

  return {
    symbol:        norm,
    providerSymbol: norm,
    last:          mockRoundSmart(last),
    bid:           mockRoundSmart(last - hs),
    ask:           mockRoundSmart(last + hs),
    spread:        mockRoundSmart(hs * 2),
    previousClose: mockRoundSmart(prevClose),
    change:        mockRoundSmart(change),
    changePercent: Number.isFinite(prevClose) && prevClose !== 0
      ? Number(((change / prevClose) * 100).toFixed(2))
      : 0,
    direction:  change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
    timestamp:  Date.now(),
    source:     'mock',
  };
}
