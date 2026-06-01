// src/services/marketData.ts
// ─────────────────────────────────────────────────────────────
// Shared market-data service for StreamBias.
// Single source of truth for quotes & candles across the app.
// Currently serves deterministic demo data; structured for
// easy Twelve Data (or any REST/WS provider) integration later.
// ─────────────────────────────────────────────────────────────

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
  source: "mock" | "twelvedata" | "websocket";
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

// ── Mock / demo data ────────────────────────────────────────

/** Realistic base prices used for demo mode. */
const MOCK_PRICES: Record<string, number> = {
  EURUSD: 1.0845,
  GBPUSD: 1.2652,
  USDJPY: 148.25,
  AUDUSD: 0.6542,
  USDCAD: 1.3582,
  NZDUSD: 0.6125,
  USDCHF: 0.8765,
  EURGBP: 0.8572,
  EURJPY: 160.85,
  GBPJPY: 187.42,

  XAUUSD: 2025.5,
  XAGUSD: 23.45,
  BTCUSD: 37245.0,
  ETHUSD: 2045.3,

  SPX500: 4587.2,
  NAS100: 16245.0,
  US30: 37580.0,
  USOIL: 72.85,

  ES: 5215.25,
  NQ: 18342.75,
  MES: 5215.25,
  MNQ: 18342.75,
  YM: 39125.0,
  RTY: 2084.6,
  CL: 78.42,
  GC: 2186.3,
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

/** Static baseline % change used to create a stable reference price. */
const MOCK_CHANGE_PCT: Record<string, number> = {
  EURUSD: 0.45,
  GBPUSD: 0.32,
  USDJPY: -0.28,
  AUDUSD: 0.05,
  USDCAD: -0.18,
  NZDUSD: -0.12,
  USDCHF: 0.08,
  EURGBP: 0.11,
  EURJPY: 0.39,
  GBPJPY: 0.41,

  XAUUSD: 1.24,
  XAGUSD: 0.95,
  BTCUSD: 2.15,
  ETHUSD: 0.45,

  SPX500: 0.85,
  NAS100: 1.12,
  US30: 0.62,
  USOIL: -0.45,

  ES: 0.48,
  NQ: 0.73,
  MES: 0.48,
  MNQ: 0.73,
  YM: 0.36,
  RTY: -0.22,
  CL: -0.58,
  GC: 0.67,
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

function getReferencePrice(base: number, changePercent: number): number {
  if (!Number.isFinite(base) || base <= 0) return base;
  const previous = base / (1 + changePercent / 100);
  return previous > 0 ? previous : base;
}

function getDirection(change: number): MarketDirection {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

/** Build a single mock quote with slight jitter so repeated calls feel alive. */
function buildMockQuote(symbol: string): MarketQuote {
  const norm = normalizeSymbol(symbol);
  const base = MOCK_PRICES[norm] ?? 1.0;

  const jitter = (Math.random() - 0.5) * base * 0.0004;
  const mid = base + jitter;

  const hs = MOCK_HALF_SPREADS[norm] ?? defaultHalfSpread(base);
  const bid = mid - hs;
  const ask = mid + hs;

  const baseChangePct = MOCK_CHANGE_PCT[norm] ?? 0;
  const previousClose = getReferencePrice(base, baseChangePct);
  const change = mid - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    symbol: norm,
    providerSymbol: toProviderSymbol(norm),
    last: roundSmart(mid),
    bid: roundSmart(bid),
    ask: roundSmart(ask),
    spread: roundSmart(ask - bid),
    previousClose: roundSmart(previousClose),
    change: roundSmart(change),
    changePercent: Number(changePercent.toFixed(2)),
    direction: getDirection(change),
    timestamp: Date.now(),
    source: "mock",
  };
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
// Calls our server-side proxy at /api/quote — the Twelve Data API key
// never reaches the browser. The proxy adds its own 5-second cache layer.

async function fetchTwelveDataQuote(symbol: string): Promise<MarketQuote | null> {
  const url = `/api/quote?symbols=${encodeURIComponent(symbol)}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return null;
  }
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
  const hs = MOCK_HALF_SPREADS[symbol] ?? defaultHalfSpread(last);

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

// ── Public API ──────────────────────────────────────────────

export async function getQuote(symbol: string): Promise<MarketQuote> {
  const norm = normalizeSymbol(symbol);

  try {
    const live = await fetchTwelveDataQuote(norm);
    if (live) return live;
  } catch {
    // fall through to mock
  }

  return buildMockQuote(norm);
}

export async function getQuotes(symbols: string[]): Promise<MarketQuote[]> {
  return Promise.all(symbols.map((s) => getQuote(s)));
}

export function getMockQuote(symbol: string): MarketQuote {
  return buildMockQuote(normalizeSymbol(symbol));
}

export function getAvailableMockSymbols(): string[] {
  return Object.keys(MOCK_PRICES);
}
