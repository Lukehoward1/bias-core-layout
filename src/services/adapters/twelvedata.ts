import type { TfCode } from '@/data/timeframes';
import type { MarketCandle, MarketQuote } from '../marketData';
import { getQuote } from '../marketData';
import type { DataProvider, ProviderResult } from '../dataProvider';

export class TwelveDataAdapter implements DataProvider {
  async fetchCandles(
    symbol: string,
    interval: TfCode,
    outputsize: number,
  ): Promise<ProviderResult<MarketCandle[]>> {
    const norm = symbol.toUpperCase().replace(/[/ ]/g, '');
    const url =
      `/api/timeseries` +
      `?symbol=${encodeURIComponent(norm)}` +
      `&interval=${interval}` +
      `&outputsize=${outputsize}`;

    let json: { status: string; values?: Record<string, string>[] };
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return { kind: 'error', message: 'Upstream error', httpStatus: res.status };
      }
      json = await res.json();
    } catch (err) {
      return { kind: 'error', message: String(err) };
    }

    if (json.status === 'error' || !Array.isArray(json.values)) {
      return { kind: 'error', message: 'Provider returned error status' };
    }

    const candles: MarketCandle[] = (json.values as Record<string, string>[]).map((v) => ({
      symbol: norm,
      timeframe: interval,
      timestamp: new Date(v.datetime).getTime(),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseFloat(v.volume ?? '0'),
    }));

    return { kind: 'ok', data: candles };
  }

  async fetchCandleRange(
    symbol: string,
    interval: TfCode,
    from: Date,
    to: Date,
  ): Promise<ProviderResult<MarketCandle[]>> {
    // Approximate with outputsize based on date range — exact range queries added in Stage 7+
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

  async fetchQuote(symbol: string): Promise<ProviderResult<MarketQuote>> {
    const quote = await getQuote(symbol);
    if (!quote) {
      return { kind: 'error', message: 'Quote unavailable' };
    }
    return { kind: 'ok', data: quote };
  }
}
