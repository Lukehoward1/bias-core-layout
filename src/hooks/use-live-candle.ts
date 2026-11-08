// src/hooks/use-live-candle.ts
// ─────────────────────────────────────────────────────────────
// Two-channel live candle updater. Produces a `liveBar` partial that
// ChartEngine merges into the last candle of the current bar set.
//
//   FAST channel: poll /api/quote every QUOTE_POLL_MS (15 s).
//     Updates the forming bar's `close` and extends high/low if the
//     quote prints beyond them.
//
//   SLOW channel: every CANDLE_REFETCH_MS (60 s) refetch the last 2
//     candles of the DISPLAY interval via /api/timeseries?forming=1.
//     If the provider's candle timestamp matches the current forming
//     bar, overwrite OHLC. If it is NEWER, emit a liveBar with the new
//     timestamp (candle rollover). Older timestamps are ignored.
//
// Twelve Data free-tier limit is 8 requests/minute across all intervals.
// At steady state (one open chart, intraday interval), the hook makes
// 4 quote calls/min + 1 timeseries call/min = 5 req/min.
//
// Both channels pause when document.hidden and resume on visibility.
//
// Timestamp units: seconds, matching OhlcDataPoint.timestamp and the
// Twelve Data adapter's `new Date(v.datetime).getTime()` normalisation
// (then /1000 in mockOhlcData.ts). Any change to that normalisation
// must be mirrored in parseProviderDatetimeSec below.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { OhlcDataPoint } from '@/lib/mockOhlcData';
import { classifyLiveBarUpdate } from '@/lib/liveBarClassify';

export const QUOTE_POLL_MS = 15_000;
export const CANDLE_REFETCH_MS = 60_000;

// Maps ChartToolbar timeframe keys → TfCode values. Mirrors mockOhlcData.ts.
const TF_TO_TFCODE: Record<string, string> = {
  m1: '1min',
  m5: '5min',
  m15: '15min',
  h1: '1h',
  h4: '4h',
  d1: '1day',
};

export type LiveBar = Partial<OhlcDataPoint> & { timestamp: number };

export interface UseLiveCandleOpts {
  symbol: string | null | undefined;
  timeframe: string;
  lastBar: OhlcDataPoint | null;
}

interface QuoteResponse {
  [symbolKey: string]: { close?: string | number; price?: string | number } | unknown;
}

interface TimeSeriesResponse {
  status?: string;
  values?: Array<{ datetime?: string; open?: string; high?: string; low?: string; close?: string }>;
}

function normSym(raw: string): string {
  return raw.toUpperCase().replace(/[/ ]/g, '');
}

function parseNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Parse a Twelve Data `datetime` string to a timestamp in SECONDS, matching
 * the shape used by OhlcDataPoint. The adapter uses `new Date(v.datetime).getTime()`
 * (no Z-suffix) for MarketCandle, and mockOhlcData.ts divides by 1000 for the chart.
 * This helper reproduces that chain so the live-bar timestamp aligns exactly with
 * the chart's bar timestamps.
 */
export function parseProviderDatetimeSec(datetime: string): number | null {
  const ms = new Date(datetime).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

async function fetchQuoteOnce(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as QuoteResponse;
    const q = json[symbol] as { close?: unknown; price?: unknown } | undefined;
    if (!q) return null;
    return parseNum(q.close) ?? parseNum(q.price);
  } catch {
    return null;
  }
}

async function fetchFormingCandle(
  symbol: string,
  interval: string,
): Promise<{ open: number; high: number; low: number; close: number; timestampSec: number } | null> {
  try {
    const res = await fetch(
      `/api/timeseries?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=2&forming=1`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as TimeSeriesResponse;
    if (json.status !== 'ok' || !Array.isArray(json.values) || json.values.length === 0) return null;
    // Twelve Data returns newest-first; the forming bar is index 0.
    const v = json.values[0];
    const o = parseNum(v.open);
    const h = parseNum(v.high);
    const l = parseNum(v.low);
    const c = parseNum(v.close);
    if (o === null || h === null || l === null || c === null) return null;
    if (!v.datetime) return null;
    const ts = parseProviderDatetimeSec(v.datetime);
    if (ts === null) return null;
    return { open: o, high: h, low: l, close: c, timestampSec: ts };
  } catch {
    return null;
  }
}

export function useLiveCandle({ symbol, timeframe, lastBar }: UseLiveCandleOpts): LiveBar | undefined {
  const [liveBar, setLiveBar] = useState<LiveBar | undefined>(undefined);
  const lastBarRef = useRef<OhlcDataPoint | null>(lastBar);
  const liveBarRef = useRef<LiveBar | undefined>(undefined);

  useEffect(() => {
    lastBarRef.current = lastBar;
  }, [lastBar]);
  useEffect(() => {
    liveBarRef.current = liveBar;
  }, [liveBar]);

  // Reset when the underlying bar or symbol changes — previous overlay no longer applies.
  useEffect(() => {
    setLiveBar(undefined);
  }, [symbol, timeframe, lastBar?.timestamp]);

  useEffect(() => {
    if (!symbol || !lastBar) return;

    const interval = TF_TO_TFCODE[timeframe] ?? '1h';
    const norm = normSym(symbol);
    let cancelled = false;

    const applyQuoteClose = (close: number) => {
      const base = lastBarRef.current;
      if (!base) return;
      const current = liveBarRef.current;
      // Base the update on the current liveBar only if it hasn't fallen behind lastBar
      // (which could happen between a bars reload and the liveBar reset). Otherwise
      // start from lastBar so a stale pre-rollover liveBar never overwrites a newer bar.
      const useLive = current && current.timestamp >= base.timestamp;
      const baseline = useLive
        ? current
        : {
            timestamp: base.timestamp,
            open: base.open,
            high: base.high,
            low: base.low,
            close: base.close,
          };
      const next: LiveBar = {
        timestamp: baseline.timestamp,
        open: baseline.open,
        high: Math.max(baseline.high ?? -Infinity, close),
        low: Math.min(baseline.low ?? Infinity, close),
        close,
      };
      setLiveBar(next);
    };

    const applyFormingCandle = (c: {
      open: number;
      high: number;
      low: number;
      close: number;
      timestampSec: number;
    }) => {
      const base = lastBarRef.current;
      if (!base) return;
      const kind = classifyLiveBarUpdate(base.timestamp, c.timestampSec);
      if (kind === 'older') return;
      // For 'same' or 'newer' we write the provider's authoritative OHLC under
      // the provider's timestamp. 'newer' is a candle rollover.
      const next: LiveBar = {
        timestamp: c.timestampSec,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      };
      setLiveBar(next);
    };

    const tickQuote = async () => {
      if (document.hidden) return;
      const close = await fetchQuoteOnce(norm);
      if (cancelled || close === null) return;
      applyQuoteClose(close);
    };

    const tickCandle = async () => {
      if (document.hidden) return;
      const c = await fetchFormingCandle(norm, interval);
      if (cancelled || !c) return;
      applyFormingCandle(c);
    };

    // Fire quote once immediately so the close-price animates fast. Do NOT
    // fire tickCandle on mount: the chart already fetched the forming bar as
    // part of its 150-bar series, and a second upstream call for the same
    // interval on first paint burns a credit on the shared Twelve Data key.
    // The first forming refresh arrives after CANDLE_REFETCH_MS.
    tickQuote();

    const qId = window.setInterval(tickQuote, QUOTE_POLL_MS);
    const cId = window.setInterval(tickCandle, CANDLE_REFETCH_MS);

    const onVis = () => {
      if (!document.hidden) {
        tickQuote();
        tickCandle();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      window.clearInterval(qId);
      window.clearInterval(cId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [symbol, timeframe, lastBar]);

  return liveBar;
}
