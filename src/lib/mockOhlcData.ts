// Mock OHLC data generator — used as fallback when live data is unavailable

import { fetchCandles } from "@/services/candleData";

// Maps ChartToolbar timeframe keys → Twelve Data interval strings
const TF_TO_TD: Record<string, string> = {
  m1: "1min",
  m5: "5min",
  m15: "15min",
  h1: "1h",
  h4: "4h",
  d1: "1day",
};

/**
 * Fetch real OHLC candles from Twelve Data and map to OhlcDataPoint[].
 * Returns mock data for symbols not in the API whitelist or when the fetch fails.
 */
export async function fetchRealOhlcData(
  symbol: string,
  timeframe: string,
): Promise<OhlcDataPoint[]> {
  const tdInterval = TF_TO_TD[timeframe] ?? "1h";
  const candles = await fetchCandles(symbol, tdInterval, 150);

  if (candles.length === 0) {
    // Symbol not whitelisted or API unavailable — fall back to generated data
    return generateMockOhlcData(symbol.toLowerCase(), timeframe, 150);
  }

  // Twelve Data returns newest-first; lightweight-charts requires oldest-first
  return [...candles].reverse().map((c) => ({
    time: new Date(c.timestamp).toISOString(),
    timestamp: Math.floor(c.timestamp / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export interface OhlcDataPoint {
  time: string; // ISO date string for display
  timestamp: number; // Unix timestamp for chart
  open: number;
  high: number;
  low: number;
  close: number;
}

// Generate realistic-looking price movements
function generatePriceMovement(basePrice: number, volatility: number): { open: number; high: number; low: number; close: number } {
  const change = (Math.random() - 0.5) * volatility;
  const open = basePrice;
  const close = basePrice + change;
  const wickRange = volatility * 0.5;
  const high = Math.max(open, close) + Math.random() * wickRange;
  const low = Math.min(open, close) - Math.random() * wickRange;
  
  return {
    open: Number(open.toFixed(5)),
    high: Number(high.toFixed(5)),
    low: Number(low.toFixed(5)),
    close: Number(close.toFixed(5)),
  };
}

// Generate mock OHLC data for different pairs
export function generateMockOhlcData(
  pair: string = 'eurusd',
  timeframe: string = 'h1',
  numCandles: number = 150
): OhlcDataPoint[] {
  const data: OhlcDataPoint[] = [];
  
  // Base prices for different pairs
  const basePrices: Record<string, number> = {
    eurusd: 1.0850,
    gbpusd: 1.2650,
    usdjpy: 149.50,
    xauusd: 2350.00,
  };
  
  // Volatility per timeframe (in price units)
  const volatilityMultipliers: Record<string, number> = {
    m1: 0.0003,
    m5: 0.0005,
    m15: 0.0008,
    h1: 0.0020,
    h4: 0.0040,
    d1: 0.0080,
  };
  
  const basePrice = basePrices[pair] || 1.0850;
  const baseVolatility = volatilityMultipliers[timeframe] || 0.0020;
  
  // Adjust volatility for non-forex pairs
  const volatility = pair === 'xauusd' ? baseVolatility * 1000 : 
                     pair === 'usdjpy' ? baseVolatility * 100 : baseVolatility;
  
  // Calculate time interval based on timeframe
  const intervalMs: Record<string, number> = {
    m1: 60 * 1000,
    m5: 5 * 60 * 1000,
    m15: 15 * 60 * 1000,
    h1: 60 * 60 * 1000,
    h4: 4 * 60 * 60 * 1000,
    d1: 24 * 60 * 60 * 1000,
  };
  
  const interval = intervalMs[timeframe] || intervalMs.h1;
  const now = Date.now();
  const startTime = now - (numCandles * interval);
  
  let currentPrice = basePrice;
  
  for (let i = 0; i < numCandles; i++) {
    const timestamp = startTime + (i * interval);
    const candle = generatePriceMovement(currentPrice, volatility);
    
    data.push({
      time: new Date(timestamp).toISOString(),
      timestamp: Math.floor(timestamp / 1000), // Convert to seconds for lightweight-charts
      ...candle,
    });
    
    currentPrice = candle.close;
  }
  
  return data;
}

// Format price for display based on pair
export function formatPrice(price: number, pair: string): string {
  if (pair === 'xauusd') return price.toFixed(2);
  if (pair === 'usdjpy') return price.toFixed(3);
  return price.toFixed(5);
}

// Format time for display
export function formatTime(timestamp: number, timeframe: string): string {
  const date = new Date(timestamp * 1000);
  
  if (timeframe === 'd1') {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  
  return date.toLocaleString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
