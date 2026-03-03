// src/data/assets.ts
// Single source of truth for all asset data across the app
// Now powered by the canonical asset registry (asset-registry.ts)

import { ASSETS, ASSET_BY_SYMBOL, type Asset as RegistryAsset } from "@/data/asset-registry";

// Re-export category type aligned with registry
export type AssetCategory = "FX" | "Crypto" | "Indices" | "Commodities" | "ETFs" | "Futures";
export type BiasDirection = "Bullish" | "Bearish" | "Neutral";

/**
 * Trading style / bias mode. Stored in localStorage by Settings/TraderStyleProvider.
 * We keep this in data-layer so everything that calls getAssetBySymbol() updates automatically.
 */
export type BiasMode = "scalping" | "intraday" | "swing";

/**
 * Asset shape used by UI.
 * (We add optional fields for bias mode/timeframes + overall bias for later UI use.)
 */
export interface Asset {
  symbol: string;
  displayName: string;
  category: AssetCategory;
  latestPrice: string;
  priceChange: string;

  // These remain the "current bias" values shown in UI
  biasDirection: BiasDirection;
  biasConfidence: number;

  sentiment: number;
  spread: string;
  volume: string;
  news: string;
  insight?: string;

  // ✅ Optional extras (won’t break anything that doesn’t use them)
  biasMode?: BiasMode;
  biasTimeframes?: string[];
  overallBiasDirection?: BiasDirection;
  overallBiasConfidence?: number;
}

// Map registry categories to legacy UI categories
function mapCategory(cat: RegistryAsset["category"]): AssetCategory {
  switch (cat) {
    case "forex":
      return "FX";
    case "crypto":
      return "Crypto";
    case "index":
      return "Indices";
    case "commodity":
      return "Commodities";
    default:
      // Registry might expand later; keep UI safe.
      return "FX";
  }
}

// Hand-curated overrides for assets that had specific mock data
const manualOverrides: Record<string, Partial<Asset>> = {
  EURUSD: {
    latestPrice: "1.08450",
    priceChange: "+0.45%",
    biasDirection: "Bullish",
    biasConfidence: 85,
    sentiment: 72,
    spread: "0.8",
    volume: "1.2M",
    news: "Today 13:30 – USD CPI (High Impact)",
    insight: "Testing 1.0850 resistance level",
  },
  GBPUSD: {
    latestPrice: "1.26520",
    priceChange: "+0.32%",
    biasDirection: "Bullish",
    biasConfidence: 78,
    sentiment: 68,
    spread: "1.2",
    volume: "980K",
    news: "Today 14:00 – GBP Retail Sales",
    insight: "Above D1 support, momentum building",
  },
  USDJPY: {
    latestPrice: "148.250",
    priceChange: "-0.28%",
    biasDirection: "Bearish",
    biasConfidence: 82,
    sentiment: -65,
    spread: "0.9",
    volume: "1.5M",
    news: "Tomorrow 08:00 – JPY GDP",
    insight: "Rejection from 149.00 resistance",
  },
  XAUUSD: {
    latestPrice: "2025.50",
    priceChange: "+1.24%",
    biasDirection: "Bullish",
    biasConfidence: 91,
    sentiment: 88,
    spread: "2.5",
    volume: "850K",
    news: "Today 15:30 – Gold Futures Report",
    insight: "Strong momentum toward 2035",
  },
  BTCUSD: {
    latestPrice: "37245.00",
    priceChange: "+2.15%",
    biasDirection: "Bullish",
    biasConfidence: 76,
    sentiment: 65,
    spread: "15.0",
    volume: "2.3M",
    news: "Today 12:00 – BTC ETF Decision",
    insight: "Consolidating above 37K support",
  },
  AUDUSD: {
    latestPrice: "0.65420",
    priceChange: "+0.05%",
    biasDirection: "Neutral",
    biasConfidence: 45,
    sentiment: 12,
    spread: "1.0",
    volume: "620K",
    news: "Tomorrow 10:30 – AUD Employment",
    insight: "Range-bound between 0.6500-0.6580",
  },
  USDCAD: {
    latestPrice: "1.35820",
    priceChange: "-0.18%",
    biasDirection: "Bearish",
    biasConfidence: 73,
    sentiment: -58,
    spread: "1.1",
    volume: "740K",
    news: "Today 16:00 – CAD Inflation",
    insight: "Breakdown below 1.3600 support",
  },
  SPX500: {
    latestPrice: "4587.20",
    priceChange: "+0.85%",
    biasDirection: "Bullish",
    biasConfidence: 80,
    sentiment: 70,
    spread: "0.5",
    volume: "3.1M",
    news: "Today 11:00 – US Market Open",
    insight: "New highs, momentum continues",
  },
  ETHUSD: {
    latestPrice: "2045.30",
    priceChange: "+0.45%",
    biasDirection: "Neutral",
    biasConfidence: 55,
    sentiment: 15,
    spread: "8.0",
    volume: "1.8M",
    news: "Today 18:00 – ETH Network Update",
    insight: "Awaiting network upgrade catalyst",
  },
  NZDUSD: {
    latestPrice: "0.61250",
    priceChange: "-0.12%",
    biasDirection: "Bearish",
    biasConfidence: 55,
    sentiment: -32,
    spread: "1.3",
    volume: "420K",
    news: "Tomorrow 09:00 – NZD Trade Balance",
    insight: "Testing weekly support zone",
  },
  US30: {
    latestPrice: "37580.00",
    priceChange: "+0.62%",
    biasDirection: "Bullish",
    biasConfidence: 75,
    sentiment: 58,
    spread: "2.0",
    volume: "2.8M",
    news: "Today 11:00 – US Market Open",
    insight: "Following S&P 500 breakout",
  },
  NAS100: {
    latestPrice: "16245.00",
    priceChange: "+1.12%",
    biasDirection: "Bullish",
    biasConfidence: 83,
    sentiment: 75,
    spread: "1.5",
    volume: "2.5M",
    news: "Today 11:00 – US Market Open",
    insight: "Tech rally continues",
  },
  XAGUSD: {
    latestPrice: "23.45",
    priceChange: "+0.95%",
    biasDirection: "Bullish",
    biasConfidence: 72,
    sentiment: 62,
    spread: "0.03",
    volume: "520K",
    news: "Today 15:30 – Precious Metals Report",
    insight: "Following gold momentum",
  },
  USOIL: {
    latestPrice: "72.85",
    priceChange: "-0.45%",
    biasDirection: "Bearish",
    biasConfidence: 65,
    sentiment: -42,
    spread: "0.04",
    volume: "1.1M",
    news: "Today 17:00 – EIA Crude Inventories",
    insight: "Demand concerns weigh",
  },
};

// Generate sensible placeholder data for registry assets without manual overrides
function generatePlaceholder(reg: RegistryAsset): Partial<Asset> {
  const directions: BiasDirection[] = ["Bullish", "Bearish", "Neutral"];
  // Deterministic pick based on symbol hash
  const hash = reg.symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const dir = directions[hash % 3];
  const confidence = 40 + (hash % 50);
  const sent = dir === "Bullish" ? hash % 60 : dir === "Bearish" ? -(hash % 60) : (hash % 20) - 10;
  const sign = dir === "Bearish" ? "-" : "+";
  const change = ((hash % 200) / 100).toFixed(2);

  return {
    latestPrice: "—",
    priceChange: `${sign}${change}%`,
    biasDirection: dir,
    biasConfidence: confidence,
    sentiment: sent,
    spread: "—",
    volume: "—",
    news: "No scheduled events",
  };
}

// Build the master asset list from the registry
export const assetsData: Asset[] = ASSETS.map((reg) => {
  const overrides = manualOverrides[reg.symbol];
  const placeholder = generatePlaceholder(reg);
  return {
    symbol: reg.symbol,
    displayName: reg.name,
    category: mapCategory(reg.category),
    ...placeholder,
    ...overrides,
  } as Asset;
});

// ── Normalisation & lookup helpers ──────────────────────────────

/** Uppercase, strip slashes, trim */
function normalizeSymbol(input: string): string {
  return input.toUpperCase().replace(/\//g, "").trim();
}

/** Resolve an alias to its canonical symbol using the registry */
function resolveAlias(normalized: string): string | undefined {
  if (ASSET_BY_SYMBOL[normalized]) return normalized;
  const found = ASSETS.find((a) => a.aliases?.some((al) => al.toUpperCase() === normalized));
  return found?.symbol;
}

// Build a fast lookup map
const assetMap = new Map<string, Asset>();
for (const asset of assetsData) {
  assetMap.set(asset.symbol, asset);
}

/* ── Bias mode / timeframe engine ────────────────────────────── */

const BIAS_MODE_KEYS = [
  // ✅ correct key used by TraderStyleProvider
  "traderStyle:v1",

  // ✅ backwards-compat keys (safe)
  "bias-mode",
  "biasMode",
  "trading-bias-mode",
  "tradingBiasMode",
  "tradingStyle",
  "trading-style",
  "traderStyle",
  "timeframeBiasMode",
] as const;

function readBiasMode(): BiasMode {
  try {
    for (const k of BIAS_MODE_KEYS) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const v = raw.toLowerCase().trim();
      if (v === "scalper") return "scalping";
      if (v === "scalping") return "scalping";
      if (v === "intraday") return "intraday";
      if (v === "swing") return "swing";
    }
  } catch {
    // ignore
  }
  return "intraday";
}

function getTimeframesForMode(mode: BiasMode): string[] {
  if (mode === "scalping") return ["5m", "15m", "1h"];
  if (mode === "swing") return ["4h", "1d", "1w"];
  return ["15m", "1h", "4h"]; // intraday
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hashString(s: string): number {
  // deterministic, stable
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function dirToScore(d: BiasDirection): number {
  if (d === "Bullish") return 1;
  if (d === "Bearish") return -1;
  return 0;
}

function scoreToDir(score: number): BiasDirection {
  if (score > 0.15) return "Bullish";
  if (score < -0.15) return "Bearish";
  return "Neutral";
}

/**
 * Style-adjust bias derived from:
 * - the asset's overall/base bias (from overrides/placeholder)
 * - deterministic per-timeframe "micro bias" so each style can differ
 *
 * When you later plug in real timeframe analysis, you replace ONLY this function’s internals.
 */
function computeBiasForMode(args: { symbol: string; overallDir: BiasDirection; overallConf: number; mode: BiasMode }) {
  const { symbol, overallDir, overallConf, mode } = args;

  const tfs = getTimeframesForMode(mode);

  // weights: shorter timeframes get slightly more weight for scalping, longer for swing
  const weights = mode === "scalping" ? [0.45, 0.35, 0.2] : mode === "swing" ? [0.2, 0.35, 0.45] : [0.25, 0.35, 0.4]; // intraday

  const baseScore = dirToScore(overallDir) * 0.55; // overall bias anchors the result

  const symbolH = hashString(symbol);

  let weightedScore = baseScore;
  let weightedConf = clamp(overallConf, 40, 95) * 0.55;

  for (let i = 0; i < tfs.length; i++) {
    const tf = tfs[i];
    const w = weights[i] ?? 1 / tfs.length;

    // micro score per timeframe (deterministic)
    const tfH = hashString(`${symbolH}:${tf}:${mode}`);
    const tfScoreRaw = ((tfH % 200) - 100) / 100; // -1 .. +1
    const tfScore = clamp(tfScoreRaw, -1, 1);

    // micro confidence: 35..90
    const tfConf = 35 + (tfH % 56);

    weightedScore += tfScore * w * 0.45;
    weightedConf += tfConf * w * 0.45;
  }

  const dir = scoreToDir(weightedScore);
  const conf = Math.round(clamp(weightedConf, 35, 95));

  return { biasDirection: dir, biasConfidence: conf, biasTimeframes: tfs };
}

/** Get asset by symbol — supports EURUSD, EUR/USD, lowercase, and aliases */
export function getAssetBySymbol(symbol: string): Asset | undefined {
  const norm = normalizeSymbol(symbol);

  const direct = assetMap.get(norm);
  const base = direct
    ? direct
    : (() => {
        const canonical = resolveAlias(norm);
        return canonical ? assetMap.get(canonical) : undefined;
      })();

  if (!base) return undefined;

  // Always keep base as the "overall" bias
  const overallDir = base.biasDirection;
  const overallConf = base.biasConfidence;

  const mode = readBiasMode();
  const styled = computeBiasForMode({
    symbol: base.symbol,
    overallDir,
    overallConf,
    mode,
  });

  // Return a COPY so we never mutate the shared assetMap record
  return {
    ...base,
    biasMode: mode,
    biasTimeframes: styled.biasTimeframes,
    overallBiasDirection: overallDir,
    overallBiasConfidence: overallConf,

    // current bias used by UI = style bias
    biasDirection: styled.biasDirection,
    biasConfidence: styled.biasConfidence,
  };
}

// Helper to get assets by category
export function getAssetsByCategory(category: AssetCategory): Asset[] {
  return assetsData.filter((asset) => asset.category === category);
}

// Helper to get all asset symbols
export function getAllAssetSymbols(): string[] {
  return assetsData.map((asset) => asset.symbol);
}

// Default assets to show when watchlist is empty (Dashboard bias snapshot)
export const defaultDashboardAssets = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"];

// Extract currencies from asset symbols for alert relevance
export function extractCurrenciesFromSymbol(symbol: string): string[] {
  const reg = ASSET_BY_SYMBOL[normalizeSymbol(symbol)];
  if (reg?.base && reg?.quote) return [reg.base, reg.quote];
  // Indices / commodities without base/quote default to USD
  if (reg) return ["USD"];
  return [];
}

// Get unique currencies from a list of asset symbols
export function getCurrenciesFromWatchlist(watchlist: string[]): string[] {
  const currencies = new Set<string>();
  watchlist.forEach((sym) => {
    extractCurrenciesFromSymbol(sym).forEach((cur) => currencies.add(cur));
  });
  return Array.from(currencies);
}
