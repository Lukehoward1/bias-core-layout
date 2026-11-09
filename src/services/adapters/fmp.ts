// src/services/adapters/fmp.ts
// FMP DataProvider — EOD daily verified on free plan (Stage 0).
// Weekly built by aggregating daily rows (FMP silently ignores 1week param).
// Intraday gated by FMP_INTRADAY_ENABLED (false until paid plan confirmed).
// Proxy at /api/fmp keeps FMP_API_KEY server-side — never inline here.

import type { TfCode } from '@/data/timeframes';
import type { MarketCandle, MarketDirection, MarketQuote } from '../marketData';
import type { DataProvider, ProviderResult } from '../dataProvider';
import { TRADE_INSTRUMENTS } from '@/data/tradeInstruments';
import { aggregateDailyToWeekly } from '../replayAggregator';
import type { AggregatorBar } from '../replayAggregator';

const FMP_INTRADAY_ENABLED = false;

// Per-second rolling-window guard: max 5 proxy calls per second.
// Distinct from candleData.ts's per-minute limiter (which controls bias fetches);
// this guards any direct adapter call (fetchQuote, fetchCandleRange, etc.).
const FMP_MAX_PER_SEC = 5;
const _fmpCallTs: number[] = [];

function msFmpWait(): number {
  const now = Date.now();
  const recent = _fmpCallTs.filter((t) => now - t < 1_000);
  if (recent.length < FMP_MAX_PER_SEC) return 0;
  const sorted = [...recent].sort((a, b) => a - b);
  return Math.max(0, sorted[recent.length - FMP_MAX_PER_SEC] + 1_000 - now);
}

async function acquireFmpSlot(): Promise<void> {
  for (;;) {
    const wait = msFmpWait();
    if (wait <= 0) {
      _fmpCallTs.push(Date.now());
      while (_fmpCallTs.length > 0 && Date.now() - _fmpCallTs[0] > 2_000) _fmpCallTs.shift();
      return;
    }
    await new Promise<void>((r) => setTimeout(r, Math.min(wait + 20, 500)));
  }
}

function fmpSymbol(symbol: string): string | null {
  const instr = TRADE_INSTRUMENTS.find((i) => i.symbol === symbol.toUpperCase());
  if (!instr) return null;
  const fmp = instr.providerSymbols.fmp;
  if (typeof fmp !== 'string') return null; // pending-paid-confirmation
  return fmp;
}

interface ProxyOkResponse { status: 'ok'; data: Record<string, unknown>[]; }
interface ProxyStatusResponse { status: 'restricted' | 'rate-limited'; }
type ProxyResponse = ProxyOkResponse | ProxyStatusResponse;

async function callProxy(fmpSym: string): Promise<ProviderResult<Record<string, unknown>[]>> {
  await acquireFmpSlot();
  const url = `/api/fmp?kind=eod&symbol=${encodeURIComponent(fmpSym)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      return { kind: 'error', message: `Proxy ${r.status}`, httpStatus: r.status };
    }
    const body = (await r.json()) as ProxyResponse;
    if (body.status === 'restricted') return { kind: 'restricted', reason: 'endpoint-not-on-plan' };
    if (body.status === 'rate-limited') return { kind: 'rate-limited' };
    return { kind: 'ok', data: body.data };
  } catch (err) {
    return { kind: 'error', message: String(err) };
  }
}

function normaliseRows(
  rows: Record<string, unknown>[],
  canonicalSymbol: string,
  timeframe: TfCode,
): MarketCandle[] {
  const norm = canonicalSymbol.toUpperCase().replace(/[/ ]/g, '');
  return rows
    .map((r) => ({
      symbol: norm,
      timeframe,
      timestamp: Date.parse((r.date as string) + 'T00:00:00Z'),
      open: r.open as number,
      high: r.high as number,
      low: r.low as number,
      close: r.close as number,
      volume: (r.volume as number) ?? 0,
    }))
    .filter((c) => Number.isFinite(c.timestamp));
}

export class FmpAdapter implements DataProvider {
  async fetchCandles(
    symbol: string,
    interval: TfCode,
    _outputsize: number,
  ): Promise<ProviderResult<MarketCandle[]>> {
    const instr = TRADE_INSTRUMENTS.find((i) => i.symbol === symbol.toUpperCase());
    if (instr) {
      const fmp = instr.providerSymbols.fmp;
      if (typeof fmp !== 'string') {
        return { kind: 'restricted', reason: 'pending-paid-confirmation' };
      }
    }

    if (interval !== '1day' && interval !== '1week') {
      if (!FMP_INTRADAY_ENABLED) {
        return { kind: 'restricted', reason: 'intraday-not-available-fmp-free' };
      }
      // FMP_INTRADAY_ENABLED = true is a future paid path — UNVERIFIED
      return { kind: 'restricted', reason: 'intraday-unverified' };
    }

    const fmpSym = fmpSymbol(symbol);
    if (!fmpSym) {
      return { kind: 'error', message: `No FMP symbol mapping for ${symbol}` };
    }

    const dailyResult = await callProxy(fmpSym);
    if (dailyResult.kind !== 'ok') return dailyResult;

    const dailyCandles = normaliseRows(dailyResult.data, symbol, '1day');
    if (dailyCandles.length === 0) {
      return { kind: 'error', message: 'FMP returned no parseable rows' };
    }

    if (interval === '1day') {
      return { kind: 'ok', data: dailyCandles };
    }

    // Weekly: FMP silently ignores 1week → build from daily.
    // aggregateDailyToWeekly expects ascending; FMP returns newest-first.
    const ascending: AggregatorBar[] = [...dailyCandles].reverse();
    const weeklyAgg = aggregateDailyToWeekly(ascending);
    const weekly: MarketCandle[] = [...weeklyAgg].reverse().map((b) => ({
      symbol: dailyCandles[0].symbol,
      timeframe: '1week' as TfCode,
      timestamp: b.timestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume ?? 0,
    }));

    return { kind: 'ok', data: weekly };
  }

  async fetchCandleRange(
    symbol: string,
    interval: TfCode,
    from: Date,
    to: Date,
  ): Promise<ProviderResult<MarketCandle[]>> {
    const result = await this.fetchCandles(symbol, interval, 5000);
    if (result.kind !== 'ok') return result;
    const filtered = result.data.filter(
      (c) => c.timestamp >= from.getTime() && c.timestamp <= to.getTime(),
    );
    return { kind: 'ok', data: filtered };
  }

  async fetchQuote(symbol: string): Promise<ProviderResult<MarketQuote>> {
    // UNVERIFIED — derived from latest EOD daily close; not a live bid/ask quote.
    const fmpSym = fmpSymbol(symbol);
    if (!fmpSym) {
      return { kind: 'error', message: `No FMP symbol mapping for ${symbol}` };
    }

    const dailyResult = await callProxy(fmpSym);
    if (dailyResult.kind !== 'ok') return dailyResult;

    const rows = dailyResult.data;
    if (rows.length === 0) return { kind: 'error', message: 'No rows from FMP for quote' };

    const r0 = rows[0];
    const prevClose = rows.length > 1 ? (rows[1].close as number) : (r0.close as number);
    const last = r0.close as number;
    const change = last - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    const norm = symbol.toUpperCase().replace(/[/ ]/g, '');
    const direction: MarketDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';

    return {
      kind: 'ok',
      data: {
        symbol: norm,
        providerSymbol: fmpSym,
        last,
        bid: last,          // UNVERIFIED — EOD close used as proxy; no live bid/ask
        ask: last,          // UNVERIFIED
        spread: 0,          // UNVERIFIED
        previousClose: prevClose,
        change,
        changePercent,
        direction,
        timestamp: Date.parse((r0.date as string) + 'T00:00:00Z'),
        source: 'fmp',
      },
    };
  }
}
