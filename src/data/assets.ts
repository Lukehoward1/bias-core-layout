// src/data/assets.ts
// Single source of truth for all asset data across the app
// Powered by the canonical asset registry (asset-registry.ts)

import { ASSETS, ASSET_BY_SYMBOL, type Asset as RegistryAsset } from "@/data/asset-registry";

// Re-export category type aligned with registry
export type AssetCategory = "FX" | "Crypto" | "Indices" | "Commodities" | "ETFs" | "Futures";
export type BiasDirection = "Bullish" | "Bearish" | "Neutral";

/**
 * Trader style / bias mode.
 * MUST stay consistent with:
 * - Settings Select values
 * - use-trader-style.ts (TraderStyle)
 */
export type BiasMode = "scalper" | "intraday" | "swing";

/**
 * Asset shape used by UI.
 * We include optional extras so any page (like AssetDetail) can display
 * the selected mode + timeframes without breaking existing code.
 */
export interface Asset {
  symbol: string;
  displayName: string;
  category: AssetCategory;
  latestPrice: string;
  priceChange: string;

  // These are the "current bias" values shown in UI (style-adjusted)
  biasDirection: BiasDirection;
  biasConfidence: number;

  sentiment: number;
  spread: string;
  volume: string;
  news: string;
  insight?: string;

  // Optional extras for later UI use
  biasMode?: BiasMode;
  biasTimeframes?: string[];
  overallBiasDirection?: BiasDirection;
  overallBiasConfidence?: number;
}

// Map registry categories to UI categories
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
    case "etf":
      return "ETFs";
    case "future":
      return "Futures";
    default:
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

// Generate placeholder data for registry assets without manual overrides
function generatePlaceholder(reg: RegistryAsset): Partial<Asset> {
  const directions: BiasDirection[] = ["Bullish", "Bearish", "Neutral"];
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
    insight: "Awaiting market context",
  };
}

// Build the master asset list from the registry
export const assetsData: Asset[] = ASSETS.map((reg) => {
  const overrides = manualOverrides[reg.symbol] || {};
  const placeholder = generatePlaceholder(reg);

  return {
    symbol: reg.symbol,
    displayName: reg.name,
    category: mapCategory(reg.category),
    latestPrice: placeholder.latestPrice ?? "—",
    priceChange: placeholder.priceChange ?? "0.00%",
    biasDirection: placeholder.biasDirection ?? "Neutral",
    biasConfidence: placeholder.biasConfidence ?? 50,
    sentiment: placeholder.sentiment ?? 0,
    spread: placeholder.spread ?? "—",
    volume: placeholder.volume ?? "—",
    news: placeholder.news ?? "No scheduled events",
    insight: placeholder.insight,
    ...overrides,
  };
});

// ── Normalisation & lookup helpers ──────────────────────────────

/** Uppercase, strip slashes, trim */
export function normalizeSymbol(input: string): string {
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

/**
 * Keys we will tolerate for backwards compatibility.
 * The canonical key you should use is "traderStyle" (from TraderStyleProvider),
 * but this keeps the app resilient if earlier builds used other names.
 */
const BIAS_MODE_KEYS = [
  "traderStyle",
  "tradingStyle",
  "trading-style",
  "bias-mode",
  "biasMode",
  "trading-bias-mode",
  "tradingBiasMode",
  "timeframeBiasMode",
] as const;

function readBiasMode(): BiasMode {
  try {
    for (const key of BIAS_MODE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const value = raw.toLowerCase().trim();

      if (value === "scalper" || value === "scalping") return "scalper";
      if (value === "intraday") return "intraday";
      if (value === "swing") return "swing";
    }
  } catch {
    // ignore
  }

  return "intraday";
}

function getTimeframesForMode(mode: BiasMode): string[] {
  if (mode === "scalper") return ["5m", "15m", "1h"];
  if (mode === "intraday") return ["15m", "1h", "4h"];
  return ["4h", "1d", "1w"];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
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
 * Demo style-adjusted bias derived from:
 * - asset's overall/base bias (from overrides/placeholder)
 * - deterministic per-timeframe "micro bias" so each style can differ
 *
 * Later, when you add real timeframe analysis, replace ONLY this function internals.
 */
function computeBiasForMode(args: { symbol: string; overallDir: BiasDirection; overallConf: number; mode: BiasMode }) {
  const { symbol, overallDir, overallConf, mode } = args;

  const timeframes = getTimeframesForMode(mode);

  const weights = mode === "scalper" ? [0.45, 0.35, 0.2] : mode === "swing" ? [0.2, 0.35, 0.45] : [0.25, 0.35, 0.4];

  const baseScore = dirToScore(overallDir) * 0.55;

  const symbolHash = hashString(symbol);

  let weightedScore = baseScore;
  let weightedConfidence = clamp(overallConf, 40, 95) * 0.55;

  for (let i = 0; i < timeframes.length; i++) {
    const timeframe = timeframes[i];
    const weight = weights[i] ?? 1 / timeframes.length;

    const timeframeHash = hashString(`${symbolHash}:${timeframe}:${mode}`);
    const timeframeScoreRaw = ((timeframeHash % 200) - 100) / 100;
    const timeframeScore = clamp(timeframeScoreRaw, -1, 1);

    const timeframeConfidence = 35 + (timeframeHash % 56);

    weightedScore += timeframeScore * weight * 0.45;
    weightedConfidence += timeframeConfidence * weight * 0.45;
  }

  const biasDirection = scoreToDir(weightedScore);
  const biasConfidence = Math.round(clamp(weightedConfidence, 35, 95));

  return {
    biasDirection,
    biasConfidence,
    biasTimeframes: timeframes,
  };
}

/** Get asset by symbol — supports EURUSD, EUR/USD, lowercase, and aliases */
export function getAssetBySymbol(symbol: string): Asset | undefined {
  const normalized = normalizeSymbol(symbol);

  const direct = assetMap.get(normalized);
  const base =
    direct ??
    (() => {
      const canonical = resolveAlias(normalized);
      return canonical ? assetMap.get(canonical) : undefined;
    })();

  if (!base) return undefined;

  const overallDir = base.biasDirection;
  const overallConf = base.biasConfidence;

  const mode = readBiasMode();
  const styled = computeBiasForMode({
    symbol: base.symbol,
    overallDir,
    overallConf,
    mode,
  });

  return {
    ...base,
    biasMode: mode,
    biasTimeframes: styled.biasTimeframes,
    overallBiasDirection: overallDir,
    overallBiasConfidence: overallConf,
    biasDirection: styled.biasDirection,
    biasConfidence: styled.biasConfidence,
  };
}

// Helper to get assets by category
export function getAssetsByCategory(category: AssetCategory): Asset[] {
  return assetsData
    .map((asset) => getAssetBySymbol(asset.symbol))
    .filter((asset): asset is Asset => !!asset)
    .filter((asset) => asset.category === category);
}

// Helper to get all asset symbols
export function getAllAssetSymbols(): string[] {
  return assetsData.map((asset) => asset.symbol);
}

// Default assets to show when watchlist is empty (Dashboard bias snapshot)
export const defaultDashboardAssets = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"];

// Extract currencies from asset symbols for alert relevance
export function extractCurrenciesFromSymbol(symbol: string): string[] {
  const registryAsset = ASSET_BY_SYMBOL[normalizeSymbol(symbol)];
  if (registryAsset?.base && registryAsset?.quote) return [registryAsset.base, registryAsset.quote];
  if (registryAsset) return ["USD"];
  return [];
}

// Get unique currencies from a list of asset symbols
export function getCurrenciesFromWatchlist(watchlist: string[]): string[] {
  const currencies = new Set<string>();

  watchlist.forEach((symbol) => {
    extractCurrenciesFromSymbol(symbol).forEach((currency) => currencies.add(currency));
  });

  return Array.from(currencies);
}
