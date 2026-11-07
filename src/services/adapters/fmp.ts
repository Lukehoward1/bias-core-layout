// FMP adapter — Stage 1a stub.
// All intraday and weekly paths are UNVERIFIED on the free plan (Stage 0 findings).
// Daily EOD for EURUSD/GBPUSD/USDJPY/GCUSD verified; all others UNVERIFIED.
// Full implementation in Stage 7.

import type { TfCode } from '@/data/timeframes';
import type { MarketCandle, MarketQuote } from '../marketData';
import type { DataProvider, ProviderResult } from '../dataProvider';
import { TRADE_INSTRUMENTS } from '@/data/tradeInstruments';

// Token-bucket throttle constants — do NOT inline these values.
const FMP_MAX_RPS = 5;
const FMP_BURST = 10;

// Simple token-bucket state.
let _tokens = FMP_BURST;
let _lastRefillMs = Date.now();

function _acquireToken(): boolean {
  const now = Date.now();
  const elapsed = (now - _lastRefillMs) / 1000;
  _tokens = Math.min(FMP_BURST, _tokens + elapsed * FMP_MAX_RPS);
  _lastRefillMs = now;
  if (_tokens >= 1) {
    _tokens -= 1;
    return true;
  }
  return false;
}

function _fmpSymbol(symbol: string): string | null {
  const instr = TRADE_INSTRUMENTS.find((i) => i.symbol === symbol.toUpperCase());
  if (!instr) return null;
  const fmp = instr.providerSymbols.fmp;
  if (typeof fmp !== 'string') return null; // pending — caller handles
  return fmp;
}

export class FmpAdapter implements DataProvider {
  async fetchCandles(
    symbol: string,
    interval: TfCode,
    _outputsize: number,
  ): Promise<ProviderResult<MarketCandle[]>> {
    // Pending-confirmation instruments short-circuit before any network call.
    const instr = TRADE_INSTRUMENTS.find((i) => i.symbol === symbol.toUpperCase());
    if (instr) {
      const fmpSym = instr.providerSymbols.fmp;
      if (typeof fmpSym !== 'string') {
        return { kind: 'restricted', reason: 'pending-paid-confirmation' };
      }
    }

    if (!_acquireToken()) {
      return { kind: 'rate-limited', retryAfterMs: Math.ceil((1 / FMP_MAX_RPS) * 1000) };
    }

    // Weekly is silently downgraded by FMP free plan — return restricted rather than
    // serving wrong-timeframe bars. Aggregation from daily is planned for Stage 7.
    if (interval === '1week') {
      return { kind: 'restricted', reason: 'weekly-not-available-fmp-free' };
    }

    // Intraday (sub-daily) is restricted on FMP free plan. // UNVERIFIED on paid
    if (interval !== '1day') {
      return { kind: 'restricted', reason: 'intraday-not-available-fmp-free' }; // UNVERIFIED — docs only
    }

    const provSym = _fmpSymbol(symbol);
    if (!provSym) {
      return { kind: 'error', message: `No FMP symbol mapping for ${symbol}` };
    }

    // Route through a serverless proxy — FMP key must never reach the browser.
    // /api/fmp/timeseries is provisioned in Stage 7.
    const url = `/api/fmp/timeseries?symbol=${encodeURIComponent(provSym)}&outputsize=${_outputsize}`;

    try {
      const res = await fetch(url);

      // 402 body is non-JSON on FMP free plan — branch BEFORE .json().
      if (res.status === 402) {
        return { kind: 'restricted', reason: 'endpoint-not-on-plan', httpStatus: 402 };
      }

      if (res.status === 429) {
        return { kind: 'rate-limited' };
      }

      if (!res.ok) {
        return { kind: 'error', message: 'Upstream error', httpStatus: res.status };
      }

      // UNVERIFIED — proxy not yet deployed; this branch unreachable in Stage 1a
      const json = await res.json() as unknown[];
      if (!Array.isArray(json)) {
        return { kind: 'error', message: 'Unexpected response shape' };
      }

      // UNVERIFIED — shape assumed from Stage 0 probe; verify when proxy is live
      const norm = symbol.toUpperCase().replace(/[/ ]/g, '');
      const candles: MarketCandle[] = json
        .map((row) => {
          const r = row as Record<string, unknown>;
          return {
            symbol: norm,
            timeframe: interval,
            // FMP daily: date "YYYY-MM-DD", no timezone — normalise to UTC midnight
            timestamp: Date.parse((r.date as string) + 'T00:00:00Z'),
            open: r.open as number,
            high: r.high as number,
            low: r.low as number,
            close: r.close as number,
            volume: (r.volume as number) ?? 0,
          };
        })
        // FMP returns newest-first; callers expect newest-first (same as TD)
        .filter((c) => Number.isFinite(c.timestamp));

      return { kind: 'ok', data: candles };
    } catch (err) {
      return { kind: 'error', message: String(err) };
    }
  }

  async fetchCandleRange(
    symbol: string,
    interval: TfCode,
    from: Date,
    to: Date,
  ): Promise<ProviderResult<MarketCandle[]>> {
    // UNVERIFIED — date-range params for FMP not yet tested
    const { TF_BY_CODE } = await import('@/data/timeframes');
    const info = TF_BY_CODE[interval];
    const rangeMs = to.getTime() - from.getTime();
    const outputsize = Math.ceil(rangeMs / (info.minutes * 60_000)) + 5;
    const result = await this.fetchCandles(symbol, interval, Math.min(outputsize, 5000));
    if (result.kind !== 'ok') return result;
    const filtered = result.data.filter(
      (c) => c.timestamp >= from.getTime() && c.timestamp <= to.getTime(),
    );
    return { kind: 'ok', data: filtered };
  }

  async fetchQuote(_symbol: string): Promise<ProviderResult<MarketQuote>> {
    // UNVERIFIED — FMP quote endpoint not yet proxied
    return { kind: 'error', message: 'FMP quote not yet implemented' };
  }
}
