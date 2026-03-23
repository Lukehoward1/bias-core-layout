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
 * This sits ABOVE the API layer.
 * APIs typically only give: currency, title, impact.
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
   1️⃣ DEFAULT CURRENCY → PAIR / ASSET MAPPING
   ========================================================= */

export const CURRENCY_DEFAULTS: Record<string, string[]> = {
  USD: ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "AUDUSD", "NZDUSD", "USDCHF", "XAUUSD", "SPX500", "NAS100", "US30"],
  EUR: ["EURUSD", "EURGBP", "EURJPY", "EURCHF"],
  GBP: ["GBPUSD", "EURGBP", "GBPJPY"],
  JPY: ["USDJPY", "EURJPY", "GBPJPY"],
  CAD: ["USDCAD"],
  AUD: ["AUDUSD"],
  NZD: ["NZDUSD"],
  CHF: ["USDCHF", "EURCHF"],
  CNY: ["USDCNH"],
};

/* =========================================================
   2️⃣ EVENT CATEGORY KEYWORD RULES
   ========================================================= */

interface KeywordRule {
  keywords: RegExp;
  tags: string[];
  extraAssets?: string[];
  extraPairs?: string[];
}

export const KEYWORD_RULES: KeywordRule[] = [
  // Central bank / rates
  {
    keywords: /(rate decision|interest rate|policy statement|fomc|ecb|boe|boj|minutes|press conference)/i,
    tags: ["rates", "monetary-policy"],
    extraAssets: ["US10Y", "US2Y", "XAUUSD"],
  },

  // Inflation
  {
    keywords: /(cpi|pce|inflation|core cpi|core pce)/i,
    tags: ["inflation"],
    extraAssets: ["XAUUSD", "US10Y", "US2Y"],
  },

  // Employment
  {
    keywords: /(non[- ]farm payrolls?|nfp|employment|unemployment|jobless claims)/i,
    tags: ["employment"],
    extraAssets: ["US10Y", "SPX500", "NAS100"],
  },

  // Growth
  {
    keywords: /(gdp|retail sales|industrial production|factory orders)/i,
    tags: ["growth"],
    extraAssets: ["SPX500", "NAS100", "US30"],
  },

  // PMI / activity
  {
    keywords: /(pmi|ism|manufacturing|services index|services pmi|manufacturing pmi)/i,
    tags: ["activity"],
    extraAssets: ["SPX500", "NAS100"],
  },

  // Oil / energy
  {
    keywords: /(crude|oil inventories|opec|wti|brent|energy)/i,
    tags: ["energy"],
    extraAssets: ["USOIL", "WTI"],
    extraPairs: ["USDCAD"],
  },

  // Gold-specific / safe haven themes
  {
    keywords: /(gold|bullion|precious metals)/i,
    tags: ["metals"],
    extraAssets: ["XAUUSD"],
  },
];

/* =========================================================
   3️⃣ SPECIAL CASE OVERRIDES
   ========================================================= */

export const EVENT_OVERRIDES: Record<string, Partial<EventImpactResult>> = {
  "Non-Farm Payrolls": {
    affectedAssets: ["XAUUSD", "US10Y", "SPX500", "NAS100", "US30"],
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
    affectedAssets: ["EURUSD", "EURGBP", "EURJPY"],
    tags: ["rates", "eur-major"],
  },
  "BOE Interest Rate Decision": {
    affectedAssets: ["GBPUSD", "EURGBP", "GBPJPY"],
    tags: ["rates", "gbp-major"],
  },
};

/* =========================================================
   4️⃣ HELPERS
   ========================================================= */

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const normalizeTitle = (title: string) => title.trim();

const getCurrenciesFromSymbol = (symbol: string): string[] => {
  const norm = symbol.toUpperCase().replace(/[^A-Z]/g, "");
  if (/^[A-Z]{6}$/.test(norm)) {
    return [norm.slice(0, 3), norm.slice(3, 6)];
  }
  return [];
};

/* =========================================================
   5️⃣ MAIN IMPACT RESOLVER
   ========================================================= */

export function getEventImpact(event: { title: string; currency: string }): EventImpactResult {
  const title = normalizeTitle(event.title || "");
  const currency = (event.currency || "").toUpperCase();

  const defaultPairs = CURRENCY_DEFAULTS[currency] || [];

  const result: EventImpactResult = {
    primaryCurrency: currency,
    affectedCurrencies: currency ? [currency] : [],
    affectedPairs: [...defaultPairs],
    affectedAssets: [],
    tags: [],
  };

  // Apply keyword rules
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

  // Apply overrides (contains match)
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

  // Infer affected currencies from affected pairs
  for (const pair of result.affectedPairs) {
    result.affectedCurrencies.push(...getCurrenciesFromSymbol(pair));
  }

  result.affectedCurrencies = unique(result.affectedCurrencies);
  result.affectedPairs = unique(result.affectedPairs);
  result.affectedAssets = unique(result.affectedAssets);
  result.tags = unique(result.tags);

  return result;
}
