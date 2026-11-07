import type { TfCode } from '@/data/timeframes';
import type { MarketCandle, MarketQuote } from './marketData';

// All provider calls return a typed result — never throw for business failures.
export type ProviderResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'restricted'; reason: string; httpStatus?: number }
  | { kind: 'rate-limited'; retryAfterMs?: number }
  | { kind: 'error'; message: string; httpStatus?: number };

export interface DataProvider {
  fetchCandles(
    symbol: string,
    interval: TfCode,
    outputsize: number,
  ): Promise<ProviderResult<MarketCandle[]>>;

  fetchCandleRange(
    symbol: string,
    interval: TfCode,
    from: Date,
    to: Date,
  ): Promise<ProviderResult<MarketCandle[]>>;

  fetchQuote(symbol: string): Promise<ProviderResult<MarketQuote>>;
}

export interface DataClock {
  now(): Date;
  subscribe(cb: (t: Date) => void): () => void;
}

export class LiveClock implements DataClock {
  private intervalMs: number;

  constructor(intervalMs = 10_000) {
    this.intervalMs = intervalMs;
  }

  now(): Date {
    return new Date();
  }

  subscribe(cb: (t: Date) => void): () => void {
    const id = setInterval(() => cb(new Date()), this.intervalMs);
    return () => clearInterval(id);
  }
}

/** Stub — replaced in Stage 8 (Replay). */
export class ReplayClock implements DataClock {
  now(): Date {
    return new Date();
  }

  subscribe(_cb: (t: Date) => void): () => void {
    return () => {};
  }
}
