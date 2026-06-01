// api/timeseries.ts — Vercel serverless function
// Proxies Twelve Data /time_series with candle-close-aware caching.
//
// IMPORTANT: Set TWELVE_DATA_API_KEY in:
//   - Vercel project settings (Dashboard → Settings → Environment Variables)
//   - .env (for local `vercel dev`)
// Do NOT use the VITE_ prefixed version — that one ships to the browser.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const API_KEY = process.env.TWELVE_DATA_API_KEY;

// ── Symbol mapping (mirrors candleData.ts — cannot import from src/) ──────────

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

// ── Candle-close-aware TTL (mirrors logic in src/services/candleData.ts) ──────

const MIN_TTL_MS = 60_000;

function getNextCandleCloseMs(interval: string): number {
  const now = new Date();
  const nowMs = now.getTime();

  if (interval === "1day") {
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    return Math.max(MIN_TTL_MS, next - nowMs);
  }

  if (interval === "4h") {
    // Closes at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
    const nextCloseHour = (Math.floor(now.getUTCHours() / 4) + 1) * 4;
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), nextCloseHour);
    return Math.max(MIN_TTL_MS, next - nowMs);
  }

  if (interval === "1h") {
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1);
    return Math.max(MIN_TTL_MS, next - nowMs);
  }

  return 300_000; // 5-minute default for sub-hour intervals
}

// ── In-memory series cache ────────────────────────────────────────────────────

interface SeriesCacheEntry {
  values: Record<string, string>[];
  expiresAt: number;
}

const cache = new Map<string, SeriesCacheEntry>();

function getFresh(key: string): Record<string, string>[] | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.values;
}

function getStale(key: string): Record<string, string>[] | null {
  return cache.get(key)?.values ?? null;
}

function setCache(key: string, values: Record<string, string>[], interval: string): void {
  cache.set(key, { values, expiresAt: Date.now() + getNextCandleCloseMs(interval) });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol, interval, outputsize } = req.query;

  if (!symbol || typeof symbol !== "string") {
    return res.status(400).json({ error: "Missing required query param: symbol" });
  }
  if (!interval || typeof interval !== "string") {
    return res.status(400).json({ error: "Missing required query param: interval" });
  }

  const size = typeof outputsize === "string" ? Math.max(1, parseInt(outputsize, 10) || 10) : 10;
  const normSym = symbol.toUpperCase().replace(/[/ ]/g, "");
  const cacheKey = `${normSym}:${interval}:${size}`;

  // Serve fresh cache immediately — no upstream call needed
  const fresh = getFresh(cacheKey);
  if (fresh) {
    const ttlRemaining = Math.max(60, Math.ceil((cache.get(cacheKey)!.expiresAt - Date.now()) / 1000));
    res.setHeader("Cache-Control", `s-maxage=${ttlRemaining}, stale-while-revalidate=60`);
    return res.status(200).json({ status: "ok", values: fresh });
  }

  if (!API_KEY) {
    // Return stale if we have it; otherwise 503
    const stale = getStale(cacheKey);
    if (stale) {
      res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
      return res.status(200).json({ status: "ok", values: stale });
    }
    return res.status(503).json({ error: "API key not configured" });
  }

  const provSym = toProviderSymbol(normSym);
  const url =
    `https://api.twelvedata.com/time_series` +
    `?symbol=${encodeURIComponent(provSym)}` +
    `&interval=${interval}` +
    `&outputsize=${size}` +
    `&apikey=${API_KEY}`;

  try {
    const upstream = await fetch(url);

    if (!upstream.ok) {
      const stale = getStale(cacheKey);
      if (stale) {
        res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
        return res.status(200).json({ status: "ok", values: stale });
      }
      return res.status(upstream.status).json({ error: "Upstream error" });
    }

    const json = await upstream.json() as { status?: string; values?: Record<string, string>[] };

    if (json.status === "error" || !Array.isArray(json.values)) {
      const stale = getStale(cacheKey);
      if (stale) {
        res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
        return res.status(200).json({ status: "ok", values: stale });
      }
      return res.status(200).json({ status: "error", values: [] });
    }

    setCache(cacheKey, json.values, interval);

    const ttlMs = getNextCandleCloseMs(interval);
    const ttlSec = Math.ceil(ttlMs / 1000);
    res.setHeader("Cache-Control", `s-maxage=${ttlSec}, stale-while-revalidate=60`);
    return res.status(200).json({ status: "ok", values: json.values });
  } catch {
    // Network/parse error — serve stale if available
    const stale = getStale(cacheKey);
    if (stale) {
      res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
      return res.status(200).json({ status: "ok", values: stale });
    }
    return res.status(503).json({ error: "Failed to reach upstream" });
  }
}
