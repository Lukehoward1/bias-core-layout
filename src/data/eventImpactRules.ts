/**
 * Event → Market Impact Mapping Layer
 *
 * This file defines how economic calendar events affect:
 * - Primary currencies
 * - FX pairs
 * - Commodities
 * - Indices
 * - Yields
 *
 * This sits above the API layer.
 * APIs typically only provide: currency, title, impact.
 * We determine affected markets here.
 */

export interface EventImpactResult {
  primaryCurrency: string;
  affectedCurrencies: string[];
  affectedPairs: string[];
  affectedAssets: string[];
  tags: string[];
}

/* =========================================================
   1) DEFAULT CURRENCY → PAIR / ASSET MAPPING
   ========================================================= */

type CurrencyImpactDefaults = {
  affectedPairs: string[];
  affectedAssets?: string[];
};

export const CURRENCY_DEFAULTS: Record<string, CurrencyImpactDefaults> = {
  USD: {
    affectedPairs: ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "AUDUSD", "NZDUSD", "USDCHF"],
    affectedAssets: ["XAUUSD", "SPX500", "NAS100", "US30", "US10Y", "US2Y"],
  },
  EUR: {
    affectedPairs: ["EURUSD", "EURGBP", "EURJPY", "EURCHF", "EURCAD", "EURAUD"],
    affectedAssets: ["GER40", "FRA40", "EUSTX50"],
  },
  GBP: {
    affectedPairs: ["GBPUSD", "EURGBP", "GBPJPY", "GBPCHF", "GBPAUD"],
    affectedAssets: ["UK100"],
  },
  JPY: {
    affectedPairs: ["USDJPY", "EURJPY", "GBPJPY", "AUDJPY", "CADJPY", "CHFJPY", "NZDJPY"],
    affectedAssets: ["JPN225"],
  },
  CAD: {
    affectedPairs: ["USDCAD", "CADJPY", "EURCAD", "AUDCAD"],
    affectedAssets: ["USOIL", "UKOIL"],
  },
  AUD: {
    affectedPairs: ["AUDUSD", "AUDJPY", "AUDCAD", "EURAUD", "GBPAUD"],
    affectedAssets: ["AUS200"],
  },
  NZD: {
    affectedPairs: ["NZDUSD", "NZDJPY"],
  },
  CHF: {
    affectedPairs: ["USDCHF", "EURCHF", "GBPCHF", "CHFJPY"],
  },
  CNY: {
    affectedPairs: ["USDCNH"],
    affectedAssets: ["HK50"],
  },
};

/* =========================================================
   2) EVENT CATEGORY KEYWORD RULES
   ========================================================= */

interface KeywordRule {
  keywords: RegExp;
  tags: string[];
  extraAssets?: string[];
  extraPairs?: string[];
}

export const KEYWORD_RULES: KeywordRule[] = [
  {
    keywords:
      /(rate decision|interest rate|policy statement|fomc|ecb|boe|boj|minutes|press conference|rate statement|monetary policy)/i,
    tags: ["rates", "monetary-policy"],
    extraAssets: ["US10Y", "US2Y", "XAUUSD"],
  },
  {
    keywords: /(cpi|pce|inflation|core cpi|core pce|headline inflation|consumer prices)/i,
    tags: ["inflation"],
    extraAssets: ["XAUUSD", "US10Y", "US2Y"],
  },
  {
    keywords: /(non[- ]farm payrolls?|nfp|employment|unemployment|jobless claims|payrolls|labor market|labour market)/i,
    tags: ["employment"],
    extraAssets: ["US10Y", "US2Y", "SPX500", "NAS100", "US30"],
  },
  {
    keywords: /(gdp|retail sales|industrial production|factory orders|durable goods|consumer spending)/i,
    tags: ["growth"],
    extraAssets: ["SPX500", "NAS100", "US30"],
  },
  {
    keywords: /(pmi|ism|manufacturing|services index|services pmi|manufacturing pmi|business activity)/i,
    tags: ["activity"],
    extraAssets: ["SPX500", "NAS100", "GER40", "UK100"],
  },
  {
    keywords: /(crude|oil inventories|opec|wti|brent|energy|eia inventories|api inventories)/i,
    tags: ["energy"],
    extraAssets: ["USOIL", "UKOIL"],
    extraPairs: ["USDCAD"],
  },
  {
    keywords: /(gold|bullion|precious metals|silver|platinum|palladium)/i,
    tags: ["metals"],
    extraAssets: ["XAUUSD", "XAGUSD"],
  },
  {
    keywords: /(trade balance|current account|exports|imports)/i,
    tags: ["trade"],
  },
  {
    keywords: /(consumer confidence|sentiment|confidence index)/i,
    tags: ["sentiment"],
    extraAssets: ["SPX500", "NAS100", "US30"],
  },
];

/* =========================================================
   3) SPECIAL CASE OVERRIDES
   ========================================================= */

export const EVENT_OVERRIDES: Record<string, Partial<EventImpactResult>> = {
  "Non-Farm Payrolls": {
    affectedAssets: ["XAUUSD", "US10Y", "US2Y", "SPX500", "NAS100", "US30"],
    tags: ["employment", "usd-major"],
  },
  "Unemployment Rate": {
    affectedAssets: ["US10Y", "US2Y", "SPX500", "NAS100"],
    tags: ["employment", "usd-major"],
  },
  "FOMC Rate Decision": {
    affectedAssets: ["XAUUSD", "US10Y", "US2Y", "SPX500", "NAS100", "US30"],
    tags: ["rates", "usd-major"],
  },
  "US CPI": {
    affectedAssets: ["XAUUSD", "US10Y", "US2Y", "SPX500", "NAS100"],
    tags: ["inflation", "usd-major"],
  },
  "US Core CPI": {
    affectedAssets: ["XAUUSD", "US10Y", "US2Y", "SPX500", "NAS100"],
    tags: ["inflation", "usd-major"],
  },
  "ECB Interest Rate Decision": {
    affectedPairs: ["EURUSD", "EURGBP", "EURJPY", "EURCHF", "EURCAD"],
    affectedAssets: ["GER40", "FRA40", "EUSTX50"],
    tags: ["rates", "eur-major"],
  },
  "BOE Interest Rate Decision": {
    affectedPairs: ["GBPUSD", "EURGBP", "GBPJPY", "GBPCHF", "GBPAUD"],
    affectedAssets: ["UK100"],
    tags: ["rates", "gbp-major"],
  },
  "BOJ Interest Rate Decision": {
    affectedPairs: ["USDJPY", "EURJPY", "GBPJPY", "AUDJPY", "CADJPY", "CHFJPY"],
    affectedAssets: ["JPN225"],
    tags: ["rates", "jpy-major"],
  },
  "German Factory Orders": {
    affectedPairs: ["EURUSD", "EURGBP", "EURJPY"],
    affectedAssets: ["GER40", "EUSTX50"],
    tags: ["growth", "eur-major"],
  },
  "Employment Change": {
    affectedPairs: ["USDCAD", "CADJPY", "EURCAD"],
    affectedAssets: ["USOIL", "UKOIL"],
    tags: ["employment", "cad-major"],
  },
};

/* =========================================================
   4) HELPERS
   ========================================================= */

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, " ");

const getCurrenciesFromSymbol = (symbol: string): string[] => {
  const normalized = symbol.toUpperCase().replace(/[^A-Z]/g, "");
  if (/^[A-Z]{6}$/.test(normalized)) {
    return [normalized.slice(0, 3), normalized.slice(3, 6)];
  }
  return [];
};

const isFxPair = (symbol: string): boolean => {
  const normalized = symbol.toUpperCase().replace(/[^A-Z]/g, "");
  return /^[A-Z]{6}$/.test(normalized);
};

const pushDefaultsForCurrency = (currency: string, result: EventImpactResult) => {
  const defaults = CURRENCY_DEFAULTS[currency];
  if (!defaults) return;

  result.affectedPairs.push(...defaults.affectedPairs);
  if (defaults.affectedAssets) {
    result.affectedAssets.push(...defaults.affectedAssets);
  }
};

const addCrossAssetSpillovers = (result: EventImpactResult) => {
  const tags = new Set(result.tags);
  const currencies = new Set(result.affectedCurrencies);

  if (currencies.has("USD")) {
    result.affectedAssets.push("XAUUSD", "US10Y", "US2Y");
  }

  if (currencies.has("EUR")) {
    result.affectedAssets.push("GER40", "FRA40", "EUSTX50");
  }

  if (currencies.has("GBP")) {
    result.affectedAssets.push("UK100");
  }

  if (currencies.has("JPY")) {
    result.affectedAssets.push("JPN225");
  }

  if (currencies.has("AUD")) {
    result.affectedAssets.push("AUS200");
  }

  if (currencies.has("CNY")) {
    result.affectedAssets.push("HK50");
  }

  if (tags.has("inflation") || tags.has("rates")) {
    result.affectedAssets.push("US10Y", "US2Y", "XAUUSD");
  }

  if (tags.has("growth") || tags.has("activity") || tags.has("sentiment")) {
    result.affectedAssets.push("SPX500", "NAS100", "US30");
  }

  if (tags.has("energy")) {
    result.affectedAssets.push("USOIL", "UKOIL");
    result.affectedPairs.push("USDCAD");
  }

  if (tags.has("metals")) {
    result.affectedAssets.push("XAUUSD", "XAGUSD");
  }
};

/* =========================================================
   5) MAIN IMPACT RESOLVER
   ========================================================= */

export function getEventImpact(event: { title: string; currency: string }): EventImpactResult {
  const title = normalizeTitle(event.title || "");
  const currency = (event.currency || "").toUpperCase();

  const result: EventImpactResult = {
    primaryCurrency: currency,
    affectedCurrencies: currency ? [currency] : [],
    affectedPairs: [],
    affectedAssets: [],
    tags: [],
  };

  if (currency) {
    pushDefaultsForCurrency(currency, result);
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.test(title)) {
      result.tags.push(...rule.tags);

      if (rule.extraAssets) {
        result.affectedAssets.push(...rule.extraAssets);
      }

      if (rule.extraPairs) {
        result.affectedPairs.push(...rule.extraPairs);
      }
    }
  }

  for (const [key, override] of Object.entries(EVENT_OVERRIDES)) {
    if (title.toLowerCase().includes(key.toLowerCase())) {
      if (override.affectedCurrencies) {
        result.affectedCurrencies.push(...override.affectedCurrencies);
      }

      if (override.affectedPairs) {
        result.affectedPairs.push(...override.affectedPairs);
      }

      if (override.affectedAssets) {
        result.affectedAssets.push(...override.affectedAssets);
      }

      if (override.tags) {
        result.tags.push(...override.tags);
      }
    }
  }

  for (const pair of result.affectedPairs) {
    result.affectedCurrencies.push(...getCurrenciesFromSymbol(pair));
  }

  addCrossAssetSpillovers(result);

  const fxPairs = result.affectedPairs.filter(isFxPair);
  const nonFxAsAssets = result.affectedPairs.filter((symbol) => !isFxPair(symbol));

  result.affectedPairs = unique(fxPairs);
  result.affectedAssets = unique([...result.affectedAssets, ...nonFxAsAssets]);
  result.affectedCurrencies = unique(result.affectedCurrencies);
  result.tags = unique(result.tags);

  return result;
}
