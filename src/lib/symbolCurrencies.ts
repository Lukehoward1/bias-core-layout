// src/lib/symbolCurrencies.ts
// Shared symbol normalisation + currency inference. Used by:
//   - AssetDetail / Markets (news filtering)
//   - Trade (ReadinessChecklist session matching)

export const normalizeMarketSymbol = (symbol: string): string =>
  symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const isFxPairSymbol = (symbol: string): boolean => /^[A-Z]{6}$/.test(symbol);

// Non-FX / non-commodity index → currency mapping.
export const INDEX_CCY: Record<string, string[]> = {
  NAS100: ["USD"],
  US30: ["USD"],
  SPX500: ["USD"],
  GER40: ["EUR"],
  UK100: ["GBP"],
};

/**
 * Returns the currencies relevant to a symbol.
 * FX pairs split into base + quote; indices use INDEX_CCY; commodity pairs (e.g.
 * XAUUSD) use the quote currency (last 3 chars); anything else falls back to USD.
 */
export function getSymbolCurrencies(symbol: string): string[] {
  const norm = normalizeMarketSymbol(symbol);
  if (isFxPairSymbol(norm)) return [norm.slice(0, 3), norm.slice(3, 6)];
  if (INDEX_CCY[norm]) return INDEX_CCY[norm];
  if (norm.length >= 6) return [norm.slice(-3)];
  return ["USD"];
}
