// src/lib/pricePrecision.ts
// Returns the number of decimal places for a symbol's price axis.
//   JPY-quoted pairs          → 3
//   Metals / indices / crypto → 2
//   All other FX              → 5

const INDEX_SYMBOLS = new Set(['NAS100', 'US30', 'SPX500', 'GER40', 'UK100']);
const CRYPTO_USD_SYMBOLS = new Set(['BTCUSD', 'ETHUSD', 'XRPUSD', 'SOLUSD', 'DOGEUSD', 'LTCUSD']);

export function pricePrecision(symbol: string): number {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.endsWith('JPY')) return 3;
  if (/^X[AG]/i.test(s) || INDEX_SYMBOLS.has(s) || CRYPTO_USD_SYMBOLS.has(s)) return 2;
  return 5;
}
