// src/services/marketData.ts
// ─────────────────────────────────────────────────────────────
// Shared market-data service for StreamBias.
// Single source of truth for quotes & candles across the app.
// Currently serves deterministic demo data; structured for
// easy Twelve Data (or any REST/WS provider) integration later.
// ─────────────────────────────────────────────────────────────

// ── Types ───────────────────────────────────────────────────

/** Normalised real-time quote used throughout the UI. */
export interface MarketQuote {
  symbol: string;            // Internal canonical symbol, e.g. "EURUSD"
  providerSymbol: string;    // Provider format, e.g. "EUR/USD"
  last: number;
  bid: number;
  ask: number;
  spread: number;            // ask − bid, in price units
  timestamp: number;         // Unix ms
  source: "mock" | "twelvedata" | "websocket";
}

/** Normalised OHLCV candle for charts / replay. */
export interface MarketCandle {
  symbol: string;
  timeframe: string;         // e.g. "1m", "5m", "1h", "1d"
  timestamp: number;         // Unix ms (candle open)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
  NAS100: "NAS100",
  US30:   "US30",
  USOIL:  "USOIL",
};

/** Normalise any input to uppercase, no slashes. */
export function normalizeSymbol(raw: string): string {
  return raw.toUpperCase().replace(/[/ ]/g, "").trim();
}

/** Convert canonical symbol → provider format (e.g. EUR/USD). */
export function toProviderSymbol(canonical: string): string {
  const norm = normalizeSymbol(canonical);
  if (SYMBOL_MAP[norm]) return SYMBOL_MAP[norm];
  // Fallback: insert "/" after first 3 chars for 6-char forex-style symbols
  if (norm.length === 6 && /^[A-Z]+$/.test(norm)) {
    return `${norm.slice(0, 3)}/${norm.slice(3)}`;
  }
  return norm;
}

/** Convert provider symbol back to canonical. */
export function fromProviderSymbol(provider: string): string {
  return normalizeSymbol(provider);
}

// ── Mock / demo data ────────────────────────────────────────

/** Realistic base prices used for demo mode. */
const MOCK_PRICES: Record<string, number> = {
  EURUSD: 1.08450,
  GBPUSD: 1.26520,
  USDJPY: 148.250,
  AUDUSD: 0.65420,
  USDCAD: 1.35820,
  NZDUSD: 0.61250,
  USDCHF: 0.87650,
  EURGBP: 0.85720,
  EURJPY: 160.850,
  GBPJPY: 187.420,
  XAUUSD: 2025.50,
  XAGUSD: 23.45,
  BTCUSD: 37245.0,
  ETHUSD: 2045.30,
  SPX500: 4587.20,
  NAS100: 16245.0,
  US30:   37580.0,
  USOIL:  72.85,
};

/** Typical half-spread in price units per symbol. */
const MOCK_HALF_SPREADS: Record<string, number> = {
  EURUSD: 0.00004,
  GBPUSD: 0.00006,
  USDJPY: 0.005,
  XAUUSD: 0.15,
  XAGUSD: 0.015,
  BTCUSD: 7.5,
  ETHUSD: 1.0,
  SPX500: 0.25,
  NAS100: 0.75,
  US30:   1.0,
  USOIL:  0.02,
};

function defaultHalfSpread(price: number): number {
  if (price > 1000) return price * 0.0001;
  if (price > 10) return 0.005;
  return 0.00005;
}

/** Build a single mock quote with slight jitter so repeated calls feel alive. */
function buildMockQuote(symbol: string): MarketQuote {
  const norm = normalizeSymbol(symbol);
  const base = MOCK_PRICES[norm] ?? 1.0;
  const jitter = (Math.random() - 0.5) * base * 0.0004; // ±0.02 %
  const mid = base + jitter;
  const hs = MOCK_HALF_SPREADS[norm] ?? defaultHalfSpread(base);
  const bid = mid - hs;
  const ask = mid + hs;

  return {
    symbol: norm,
    providerSymbol: toProviderSymbol(norm),
    last: Number(mid.toPrecision(7)),
    bid: Number(bid.toPrecision(7)),
    ask: Number(ask.toPrecision(7)),
    spread: Number((ask - bid).toPrecision(4)),
    timestamp: Date.now(),
    source: "mock",
  };
}

// ── Twelve Data integration (placeholder) ───────────────────
//
// When VITE_TWELVE_API_KEY is set the service will prefer live
// data and fall back to mock on failure.
//
// Usage (future):
//   const apiKey = import.meta.env.VITE_TWELVE_API_KEY;
//
// The fetch helpers below are intentionally left as stubs so
// the file compiles and runs today without any env vars.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchTwelveDataQuote(_symbol: string): Promise<MarketQuote | null> {
  // TODO: implement when VITE_TWELVE_API_KEY is available
  // const apiKey = import.meta.env.VITE_TWELVE_API_KEY;
  // if (!apiKey) return null;
  // const url = `https://api.twelvedata.com/price?symbol=${toProviderSymbol(_symbol)}&apikey=${apiKey}`;
  // const res = await fetch(url);
  // if (!res.ok) return null;
  // const json = await res.json();
  // return { ...normalise(json), source: "twelvedata" };
  return null;
}

// ── Public API ──────────────────────────────────────────────

/**
 * Get a normalised quote for a single symbol.
 * Returns live data when available, otherwise mock.
 */
export async function getQuote(symbol: string): Promise<MarketQuote> {
  const norm = normalizeSymbol(symbol);
  try {
    const live = await fetchTwelveDataQuote(norm);
    if (live) return live;
  } catch {
    // Swallow – fall through to mock
  }
  return buildMockQuote(norm);
}

/**
 * Get normalised quotes for multiple symbols in one call.
 */
export async function getQuotes(symbols: string[]): Promise<MarketQuote[]> {
  return Promise.all(symbols.map((s) => getQuote(s)));
}

/**
 * Synchronous mock quote – useful when you need data immediately
 * without awaiting (e.g. initial render, fallback).
 */
export function getMockQuote(symbol: string): MarketQuote {
  return buildMockQuote(normalizeSymbol(symbol));
}

/**
 * List all symbols that have demo pricing available.
 */
export function getAvailableMockSymbols(): string[] {
  return Object.keys(MOCK_PRICES);
}
