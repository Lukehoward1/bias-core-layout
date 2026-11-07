import { fetchCandles } from "@/services/candleData";

export interface OhlcDataPoint {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Maps ChartToolbar timeframe keys → TfCode values
const TF_TO_TFCODE: Record<string, string> = {
  m1: "1min",
  m5: "5min",
  m15: "15min",
  h1: "1h",
  h4: "4h",
  d1: "1day",
};

/**
 * Fetch real OHLC candles and map to OhlcDataPoint[].
 * Returns null when the symbol is not whitelisted or the fetch fails.
 * Callers must render an appropriate empty state on null.
 */
export async function fetchRealOhlcData(
  symbol: string,
  timeframe: string,
): Promise<OhlcDataPoint[] | null> {
  const interval = TF_TO_TFCODE[timeframe] ?? "1h";
  const candles = await fetchCandles(symbol, interval, 150);

  if (candles.length === 0) return null;

  // fetchCandles returns newest-first; lightweight-charts requires oldest-first
  return [...candles].reverse().map((c) => ({
    time: new Date(c.timestamp).toISOString(),
    timestamp: Math.floor(c.timestamp / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export function formatPrice(price: number, pair: string): string {
  if (pair === 'xauusd') return price.toFixed(2);
  if (pair === 'usdjpy') return price.toFixed(3);
  return price.toFixed(5);
}

export function formatTime(timestamp: number, timeframe: string): string {
  const date = new Date(timestamp * 1000);

  if (timeframe === 'd1') {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
