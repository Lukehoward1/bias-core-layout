// api/_lib/fmpProxy.ts — shared helper (NOT a Vercel function; files under _lib are excluded).
// Called from api/timeseries.ts when req.query.provider === 'fmp'.
//
// Response shapes (always HTTP 200 for data/status payloads):
//   { status: "ok",           data: [...rows] }  — rows newest-first
//   { status: "restricted"                     }  — 402 / 403 / non-JSON response
//   { status: "rate-limited"                   }  — 429
//
// Cache: s-maxage until next UTC midnight (60–3600 s), stale-while-revalidate=60.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const FMP_BASE = "https://financialmodelingprep.com";

const FMP_SYMBOL_WHITELIST = new Set([
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD",
  "USDCAD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY",
  "GCUSD",
]);

function ttlSeconds(): number {
  const now = Date.now();
  const midnight = new Date(now);
  midnight.setUTCHours(0, 0, 0, 0);
  midnight.setUTCDate(midnight.getUTCDate() + 1);
  return Math.min(3600, Math.max(60, Math.ceil((midnight.getTime() - now) / 1000)));
}

export async function handleFmp(req: VercelRequest, res: VercelResponse): Promise<void> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    res.setHeader("Cache-Control", "no-store");
    res.status(503).json({ error: "FMP key not configured" });
    return;
  }

  const sym = (req.query.symbol as string | undefined)?.toUpperCase();
  const kind = req.query.kind as string | undefined;

  if (kind !== "eod" || !sym) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ error: "Required: kind=eod&symbol=<FMP_SYMBOL>" });
    return;
  }

  if (!FMP_SYMBOL_WHITELIST.has(sym)) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ error: "Symbol not served by this proxy" });
    return;
  }

  const upstream = `${FMP_BASE}/stable/historical-price-eod/full?symbol=${encodeURIComponent(sym)}&apikey=${apiKey}`;

  try {
    const r = await fetch(upstream);

    // 402/403 bodies are non-JSON on FMP free plan — NEVER call .json() on them.
    if (r.status === 402 || r.status === 403) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ status: "restricted" });
      return;
    }

    if (r.status === 429) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ status: "rate-limited" });
      return;
    }

    if (!r.ok) {
      res.setHeader("Cache-Control", "no-store");
      res.status(502).json({ error: `FMP upstream ${r.status}` });
      return;
    }

    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ status: "restricted" });
      return;
    }

    const data = (await r.json()) as unknown;
    if (!Array.isArray(data)) {
      res.setHeader("Cache-Control", "no-store");
      res.status(502).json({ error: "Unexpected FMP response shape" });
      return;
    }

    const ttl = ttlSeconds();
    res.setHeader("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=60`);
    res.status(200).json({ status: "ok", data });
  } catch {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "Upstream fetch failed" });
  }
}
