// api/economic-calendar.ts — Vercel serverless function
// Proxies FMP /economic_calendar so the API key never leaves the server.
//
// IMPORTANT: Set FMP_API_KEY in:
//   - Vercel project settings (Dashboard → Settings → Environment Variables)
//   - .env (for local `vercel dev`)
// Do NOT use the VITE_ prefixed version — that one ships to the browser.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const API_KEY = process.env.FMP_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { from, to } = req.query;
  if (!from || !to || typeof from !== "string" || typeof to !== "string") {
    return res.status(400).json({ error: "Missing ?from= or ?to= query params" });
  }

  if (!API_KEY) {
    console.error("[economic-calendar] FMP_API_KEY is not set");
    return res.status(500).json({ error: "API key not configured" });
  }

  const url =
    `https://financialmodelingprep.com/api/v3/economic_calendar` +
    `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&apikey=${API_KEY}`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` });
    }
    const data = await upstream.json();
    // Client already caches for 30 min — short edge cache prevents burst hammering FMP.
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[economic-calendar] Fetch failed:", message);
    return res.status(500).json({ error: message });
  }
}
