// src/services/apiQueue.ts
// Shared rate-limit queue for all outgoing market-data API calls.
// candleData.ts (/api/timeseries) and marketData.ts (/api/quote) both import
// from here so their calls share one rolling-window counter.

/** Maximum upstream API calls per rolling 60-second window (TD Basic tier).
 *  Raise this constant after switching to FMP or a higher-tier TD plan. */
export const REQUESTS_PER_MIN = 6;

/** FMP candle endpoint: much higher limit — used by waitForSlot when FMP is active. */
export const FMP_MAX_PER_MIN_CANDLE = 240;

/** Priority tiers for queue ordering. Higher number = runs first. */
export const PRIORITY_CHART = 2;   // chart visible TF + live quote
export const PRIORITY_BIAS = 1;    // bias / structure / entry TFs
export const PRIORITY_LEVELS = 0;  // levels overlay data

const MAX_CONCURRENT = 2;
let _active = 0;

interface QueueTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  priority: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _queue: QueueTask<any>[] = [];

/** Shared call-timestamp log across candle and quote fetches. Exported for tests. */
export const _callTimestamps: number[] = [];

/**
 * Returns ms to wait before another call can be issued without exceeding
 * maxPerMin in a rolling 60s window. Exported for tests.
 */
export function msToWait(timestamps: number[], nowMs: number, maxPerMin: number): number {
  const recent = timestamps.filter((t) => nowMs - t < 60_000);
  if (recent.length < maxPerMin) return 0;
  const sorted = [...recent].sort((a, b) => a - b);
  return Math.max(0, sorted[recent.length - maxPerMin] + 60_000 - nowMs);
}

/** Claims one rate-limit slot; waits if the rolling window is full. */
export async function waitForSlot(maxPerMin: number = REQUESTS_PER_MIN): Promise<void> {
  for (;;) {
    const now = Date.now();
    const wait = msToWait(_callTimestamps, now, maxPerMin);
    if (wait <= 0) {
      _callTimestamps.push(now);
      while (_callTimestamps.length > 0 && now - _callTimestamps[0] > 120_000) {
        _callTimestamps.shift();
      }
      return;
    }
    await new Promise<void>((r) => setTimeout(r, Math.min(wait + 50, 2_000)));
  }
}

function _drain(): void {
  while (_active < MAX_CONCURRENT && _queue.length > 0) {
    const task = _queue.shift()!;
    _active++;
    task.fn().then(task.resolve, task.reject).finally(() => {
      _active--;
      _drain();
    });
  }
}

/**
 * Returns the effective requests-per-minute limit for the active provider.
 * Reads VITE_DATA_PROVIDER directly so apiQueue.ts stays free of circular
 * imports (activeProvider.ts → adapters/twelvedata.ts → marketData.ts → apiQueue.ts).
 */
export function getSlotLimit(): number {
  const provider = (import.meta.env.VITE_DATA_PROVIDER as string | undefined) ?? 'twelvedata';
  return provider === 'fmp' ? FMP_MAX_PER_MIN_CANDLE : REQUESTS_PER_MIN;
}

// ── Priority symbol ───────────────────────────────────────────
// Stored here (not in candleData.ts) so marketData.ts can read it without
// importing candleData.ts, which would create a circular dependency.
let _prioritySymbol: string | null = null;

/** Set by Trade/AssetDetail when the user views a specific asset. */
export function setPrioritySymbol(symbol: string | null): void {
  _prioritySymbol = symbol ? symbol.toUpperCase().replace(/[/ ]/g, '').trim() : null;
}

/** Returns the currently-viewed symbol, or null if none. */
export function getPrioritySymbol(): string | null {
  return _prioritySymbol;
}

/** Enqueue a task; higher priority number runs first. Equal priorities preserve insertion order. */
export function enqueueApiRequest<T>(fn: () => Promise<T>, priority: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const task: QueueTask<T> = { fn, resolve, reject, priority };
    const idx = _queue.findIndex((e) => e.priority < priority);
    if (idx === -1) {
      _queue.push(task);
    } else {
      _queue.splice(idx, 0, task);
    }
    _drain();
  });
}
