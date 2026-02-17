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
   1️⃣ DEFAULT CURRENCY → PAIR MAPPING
   ========================================================= */

export const CURRENCY_DEFAULTS: Record<string, string[]> = {
  USD: ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "AUDUSD", "NZDUSD", "XAUUSD"],
  EUR: ["EURUSD", "EURGBP", "EURJPY"],
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
}

export const KEYWORD_RULES: KeywordRule[] = [
  // 🔵 Central Bank / Rates
  {
    keywords: /(rate decision|interest rate|policy statement|fomc|ecb|boe|boj|minutes|press conference)/i,
    tags: ["rates", "monetary-policy"],
    extraAssets: ["US10Y", "US2Y"],
  },
  // 🔴 Inflation
  {
    keywords: /(cpi|pce|inflation|core cpi|core pce)/i,
    tags: ["inflation"],
    extraAssets: ["XAUUSD", "US10Y"],
  },
  // 🟢 Employment
  {
    keywords: /(non-farm payroll|nfp|employment|unemployment|jobless claims)/i,
    tags: ["employment"],
    extraAssets: ["US10Y"],
  },
  // 🟡 Growth
  {
    keywords: /(gdp|retail sales|industrial production)/i,
    tags: ["growth"],
  },
  // 🟣 PMI / Activity
  {
    keywords: /(pmi|ism|manufacturing|services index)/i,
    tags: ["activity"],
  },
  // 🟤 Oil-specific
  {
    keywords: /(crude|oil inventories|opec)/i,
    tags: ["energy"],
    extraAssets: ["WTI", "USOIL"],
  },
];

/* =========================================================
   3️⃣ SPECIAL CASE OVERRIDES
   ========================================================= */

export const EVENT_OVERRIDES: Record<string, Partial<EventImpactResult>> = {
  // Major USD events often spill into equities + gold
  "Non-Farm Payrolls": {
    affectedAssets: ["XAUUSD", "US10Y", "SPX500"],
  },
  "FOMC Rate Decision": {
    affectedAssets: ["XAUUSD", "US10Y", "SPX500"],
  },
  "US CPI": {
    affectedAssets: ["XAUUSD", "US10Y"],
  },
};

/* =========================================================
   4️⃣ MAIN IMPACT RESOLVER
   ========================================================= */

export function getEventImpact(event: {
  title: string;
  currency: string;
}): EventImpactResult {
  const title = event.title || "";
  const currency = (event.currency || "").toUpperCase();

  const defaultPairs = CURRENCY_DEFAULTS[currency] || [];

  const result: EventImpactResult = {
    primaryCurrency: currency,
    affectedCurrencies: [currency],
    affectedPairs: [...defaultPairs],
    affectedAssets: [],
    tags: [],
  };

  // Apply keyword rules
  KEYWORD_RULES.forEach((rule) => {
    if (rule.keywords.test(title)) {
      result.tags.push(...rule.tags);
      if (rule.extraAssets) {
        result.affectedAssets.push(...rule.extraAssets);
      }
    }
  });

  // Apply overrides (contains match)
  Object.entries(EVENT_OVERRIDES).forEach(([key, override]) => {
    if (title.toLowerCase().includes(key.toLowerCase())) {
      if (override.affectedAssets) {
        result.affectedAssets.push(...override.affectedAssets);
      }
      if ((override as any).tags) {
        result.tags.push(...((override as any).tags as string[]));
      }
    }
  });

  // Remove duplicates
  result.affectedPairs = Array.from(new Set(result.affectedPairs));
  result.affectedAssets = Array.from(new Set(result.affectedAssets));
  result.tags = Array.from(new Set(result.tags));

  return result;
}
