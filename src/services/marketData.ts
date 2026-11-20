// src/services/marketData.ts
// ─────────────────────────────────────────────────────────────
// Shared market-data service for StreamBias.
// Single source of truth for quotes across the app.
//
// getQuote() returns MarketQuote | null. On fetch failure, upstream
// error, or unrecognised symbol we return null — we NEVER fabricate a
// price. The provider (MarketDataProvider) is responsible for holding
// onto the last successful quote and flipping stale=true so the UI can
// mark it visibly. Alerts skip evaluation on stale quotes.
//
// Currently backed by /api/quote (Twelve Data proxy). The provider
// swap to FMP happens at the /api/quote layer, not here.
// ─────────────────────────────────────────────────────────────

import { MOCK_CANDLES_ENABLED, generateMockQuote } from '@/lib/mockCandleGenerator';
import {
  enqueueApiRequest,
  waitForSlot,
  msToWait,
  _callTimestamps,
  PRIORITY_CHART,
  PRIORITY_BIAS,
  getSlotLimit,
  getPrioritySymbol,
} from './apiQueue';

// ── Types ───────────────────────────────────────────────────

/** Direction of move vs reference price. */
export type MarketDirection = "up" | "down" | "flat";

/** Normalised real-time quote used throughout the UI. */
export interface MarketQuote {
  symbol: string;
  providerSymbol: string;
  last: number;
  bid: number;
  ask: number;
  spread: number;
  previousClose: number;
  change: number;
  changePercent: number;
  direction: MarketDirection;
  timestamp: number;
  source: "twelvedata" | "websocket" | "fmp" | "mock";
  /**
   * True when this quote is the last-known-good value carried over from an
   * earlier successful poll because the most recent fetch failed. UI must
   * mark stale quotes visibly; alerts must skip stale quotes.
   * Fresh quotes leave this undefined.
   */
  stale?: boolean;
}

/** Normalised OHLCV candle for charts / replay. */
export interface MarketCandle {
  symbol: string;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** UI-friendly formatted change object for consistent display. */
export interface FormattedMarketChange {
  value: string;
  direction: MarketDirection;
}

// ── Symbol mapping ──────────────────────────────────────────

/** Canonical → provider display symbol. */
const SYMBOL_MAP: Record<string, string> = {
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  NZDUSD: "NZD/USD",
  USDCHF: "USD/CHF",
  EURGBP: "EUR/GBP",
  EURJPY: "EUR/JPY",
  GBPJPY: "GBP/JPY",
  XAUUSD: "XAU/USD",
  XAGUSD: "XAG/USD",
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",

  SPX500: "SPX500",
  NAS100: "NASDAQ",
  US30: "DJI",
  USOIL: "WTI",

  ES: "ES",
  NQ: "NQ",
  MES: "MES",
  MNQ: "MNQ",
  YM: "YM",
  RTY: "RTY",
  CL: "CL",
  GC: "GC",
};

/** Normalise any input to uppercase, no slashes. */
export function normalizeSymbol(raw: string): string {
  return raw.toUpperCase().replace(/[/ ]/g, "").trim();
}

/** Convert canonical symbol → provider format. */
export function toProviderSymbol(canonical: string): string {
  const norm = normalizeSymbol(canonical);
  if (SYMBOL_MAP[norm]) return SYMBOL_MAP[norm];

  if (norm.length === 6 && /^[A-Z]+$/.test(norm)) {
    return `${norm.slice(0, 3)}/${norm.slice(3)}`;
  }

  return norm;
}

/** Convert provider symbol back to canonical. */
export function fromProviderSymbol(provider: string): string {
  return normalizeSymbol(provider);
}

// ── Bid/ask synthesis helpers ───────────────────────────────
// The upstream feed returns a single last price. We synthesise bid/ask
// from a typical half-spread so downstream code (position sizing, etc.)
// has a consistent shape. These are heuristics for display/UX — not
// used for pricing or risk decisions.

/** Typical half-spread in price units per symbol. */
const HALF_SPREADS: Record<string, number> = {
  EURUSD: 0.00004,
  GBPUSD: 0.00006,
  USDJPY: 0.005,
  XAUUSD: 0.15,
  XAGUSD: 0.015,
  BTCUSD: 7.5,
  ETHUSD: 1.0,

  SPX500: 0.25,
  NAS100: 0.75,
  US30: 1.0,
  USOIL: 0.02,

  ES: 0.25,
  NQ: 0.25,
  MES: 0.25,
  MNQ: 0.25,
  YM: 1,
  RTY: 0.1,
  CL: 0.01,
  GC: 0.1,
};

function defaultHalfSpread(price: number): number {
  if (price > 10000) return price * 0.00002;
  if (price > 1000) return price * 0.0001;
  if (price > 10) return 0.005;
  return 0.00005;
}

function roundSmart(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toPrecision(7));
}

function getDirection(change: number): MarketDirection {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

// ── Formatting helpers ──────────────────────────────────────

export function formatChangePercent(value: number): string {
  if (!Number.isFinite(value)) return "0.00%";
  if (value > 0) return `+${value.toFixed(2)}%`;
  if (value < 0) return `${value.toFixed(2)}%`;
  return "0.00%";
}

export function getFormattedMarketChange(quote: MarketQuote | null | undefined): FormattedMarketChange {
  if (!quote) {
    return {
      value: "0.00%",
      direction: "flat",
    };
  }

  return {
    value: formatChangePercent(quote.changePercent),
    direction: quote.direction,
  };
}

// ── Quote proxy integration ───────────────────────────────────
// Calls our server-side proxy at /api/quote — the upstream provider API
// key never reaches the browser. The proxy adds its own cache layer.
//
// Quotes share the same rolling-window rate limiter as candle fetches
// (via apiQueue.ts) so combined outgoing calls stay within REQUESTS_PER_MIN.

const _RATE_LIMITED = Symbol('rate-limited');

async function _doFetchQuote(symbol: string): Promise<MarketQuote | null | typeof _RATE_LIMITED> {
  const url = `/api/quote?symbols=${encodeURIComponent(symbol)}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return null;
  }
  if (res.status === 429) return _RATE_LIMITED;
  if (!res.ok) return null;

  const json = await res.json();
  // Proxy returns { [canonicalSymbol]: quoteData }
  const quoteData = json[symbol] as Record<string, string> | undefined;
  if (!quoteData || !quoteData["close"]) return null;

  const last = parseFloat(quoteData["close"]);
  const previousClose = parseFloat(quoteData["previous_close"]);
  const change = parseFloat(quoteData["change"]);
  const changePercent = parseFloat(quoteData["percent_change"]);

  if (!Number.isFinite(last) || last <= 0) return null;

  const providerSymbol = toProviderSymbol(symbol);
  const hs = HALF_SPREADS[symbol] ?? defaultHalfSpread(last);

  return {
    symbol,
    providerSymbol,
    last: roundSmart(last),
    bid: roundSmart(last - hs),
    ask: roundSmart(last + hs),
    spread: roundSmart(hs * 2),
    previousClose: roundSmart(previousClose),
    change: roundSmart(change),
    changePercent: Number(changePercent.toFixed(2)),
    direction: getDirection(change),
    timestamp: Date.now(),
    source: "twelvedata",
  };
}

// In-flight dedup: one upstream call per symbol at a time.
const _quoteInFlight = new Map<string, Promise<MarketQuote | null>>();

// ── Public API ──────────────────────────────────────────────

/**
 * Fetch a fresh quote for a single symbol. Returns null on any failure
 * (network error, non-OK response, unrecognised symbol, malformed body).
 * Callers must handle null explicitly — this function NEVER fabricates
 * a price. The provider layer decides whether to fall back to a
 * last-known-good stale value or to show unavailable state.
 *
 * Routes through the shared apiQueue rate limiter (REQUESTS_PER_MIN) and
 * deduplicates concurrent callers for the same symbol.
 */
export async function getQuote(symbol: string): Promise<MarketQuote | null> {
  const norm = normalizeSymbol(symbol);
  // ── Mock mode (dev only) ──────────────────────────────────
  if (MOCK_CANDLES_ENABLED) return generateMockQuote(norm);

  const inflight = _quoteInFlight.get(norm);
  if (inflight) return inflight;

  // Quote for the currently-viewed symbol runs at PRIORITY_CHART (2) so it
  // lands before bias/structure/entry candles. Watchlist / Markets quotes run
  // at PRIORITY_BIAS (1) — below chart candles but above levels data.
  const slotLimit = getSlotLimit();
  const quotePriority = getPrioritySymbol() === norm ? PRIORITY_CHART : PRIORITY_BIAS;

  const promise = enqueueApiRequest(async (): Promise<MarketQuote | null> => {
    await waitForSlot(slotLimit);
    const result = await _doFetchQuote(norm);
    if (result === _RATE_LIMITED) {
      // Wait for the rolling window to reset, then retry once
      const windowMs = msToWait(_callTimestamps, Date.now(), slotLimit);
      await new Promise<void>((r) => setTimeout(r, Math.max(windowMs, 5_000) + 500));
      await waitForSlot(slotLimit);
      const retry = await _doFetchQuote(norm);
      return retry === _RATE_LIMITED ? null : retry;
    }
    return result;
  }, quotePriority).catch(() => null);

  _quoteInFlight.set(norm, promise);
  promise.finally(() => _quoteInFlight.delete(norm));
  return promise;
}

/**
 * Fetch fresh quotes for a batch of symbols. Failed symbols come back
 * as null in the same slot — callers can zip results with the input
 * array. See getQuote() for the never-fabricate contract.
 */
export async function getQuotes(symbols: string[]): Promise<(MarketQuote | null)[]> {
  return Promise.all(symbols.map((s) => getQuote(s)));
}
