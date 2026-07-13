// api/quote.ts — Vercel serverless function
// Proxies Twelve Data /quote and caches results server-side.
//
// IMPORTANT: Set TWELVE_DATA_API_KEY in:
//   - Vercel project settings (Dashboard → Settings → Environment Variables)
//   - .env (for local `vercel dev`)
// Do NOT use the VITE_ prefixed version — that one ships to the browser.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const API_KEY = process.env.TWELVE_DATA_API_KEY;

// ── Symbol mapping (mirrors marketData.ts — cannot import from src/) ──────────

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
  NAS100: "NASDAQ",
  US30: "DJI",
  GER40: "GER40",
  UK100: "UK100",
  SPX500: "SPX500",
  USOIL: "WTI",
};

function toProviderSymbol(canonical: string): string {
  const norm = canonical.toUpperCase().replace(/[/ ]/g, "");
  if (SYMBOL_MAP[norm]) return SYMBOL_MAP[norm];
  if (norm.length === 6 && /^[A-Z]+$/.test(norm)) return `${norm.slice(0, 3)}/${norm.slice(3)}`;
  return norm;
}

// ── In-memory quote cache (shared across requests within the same serverless instance) ──

interface QuoteCacheEntry {
  data: Record<string, unknown>;
  expiresAt: number; // freshness window
}

const cache = new Map<string, QuoteCacheEntry>();
const QUOTE_TTL_MS = 20_000; // 20 seconds — matches 15s client poll with buffer for timing drift

function getFresh(sym: string): Record<string, unknown> | null {
  const entry = cache.get(sym);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

function getStale(sym: string): Record<string, unknown> | null {
  return cache.get(sym)?.data ?? null;
}

function setCache(sym: string, data: Record<string, unknown>): void {
  cache.set(sym, { data, expiresAt: Date.now() + QUOTE_TTL_MS });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbols = req.query.symbols;
  if (!rawSymbols || typeof rawSymbols !== "string") {
    return res.status(400).json({ error: "Missing ?symbols= query param" });
  }

  const symbols = rawSymbols
    .split(",")
    .map((s) => s.trim().toUpperCase().replace(/[/ ]/g, ""))
    .filter(Boolean);

  if (symbols.length === 0) {
    return res.status(400).json({ error: "No valid symbols provided" });
  }

  // Split into cached vs needs-fetch
  const result: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const sym of symbols) {
    const hit = getFresh(sym);
    if (hit) {
      result[sym] = hit;
    } else {
      missing.push(sym);
    }
  }

  // Fetch missing symbols from Twelve Data in one batched request
  if (missing.length > 0 && API_KEY) {
    const providerSymbols = missing.map(toProviderSymbol).join(",");
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(providerSymbols)}&apikey=${API_KEY}`;

    try {
      const upstream = await fetch(url);

      if (upstream.ok) {
        const json = await upstream.json() as Record<string, unknown>;

        if (missing.length === 1) {
          // Single-symbol: Twelve Data returns the quote object directly
          const sym = missing[0];
          const q = json as Record<string, unknown>;
          if (q && q["close"] && q["status"] !== "error") {
            setCache(sym, q);
            result[sym] = q;
          } else {
            const stale = getStale(sym);
            if (stale) result[sym] = stale;
          }
        } else {
          // Multi-symbol: response is { "EUR/USD": {...}, "GBP/USD": {...} }
          for (const sym of missing) {
            const provSym = toProviderSymbol(sym);
            const q = json[provSym] as Record<string, unknown> | undefined;
            if (q && q["close"] && q["status"] !== "error") {
              setCache(sym, q);
              result[sym] = q;
            } else {
              const stale = getStale(sym);
              if (stale) result[sym] = stale;
            }
          }
        }
      } else {
        // HTTP error — fall back to stale cached values
        for (const sym of missing) {
          const stale = getStale(sym);
          if (stale) result[sym] = stale;
        }
      }
    } catch {
      // Network error — fall back to stale cached values
      for (const sym of missing) {
        const stale = getStale(sym);
        if (stale) result[sym] = stale;
      }
    }
  }

  // s-maxage tells Vercel's edge CDN to cache for 15s; stale-while-revalidate
  // lets it serve the stale response for another 20s while it re-validates.
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=20");
  return res.status(200).json(result);
}
