// Single source of truth for all asset data across the app
// This file provides the canonical asset information used by Markets, AssetDetail, Dashboard, and Alerts

export type AssetCategory = 'FX' | 'Crypto' | 'Indices' | 'Commodities' | 'ETFs' | 'Futures';
export type BiasDirection = 'Bullish' | 'Bearish' | 'Neutral';

export interface Asset {
  symbol: string;
  displayName: string;
  category: AssetCategory;
  latestPrice: string;
  priceChange: string;
  biasDirection: BiasDirection;
  biasConfidence: number;
  sentiment: number;
  spread: string;
  volume: string;
  news: string;
  insight?: string;
}

// Master asset dataset - THE ONLY SOURCE OF TRUTH
export const assetsData: Asset[] = [
  {
    symbol: 'EURUSD',
    displayName: 'EUR/USD',
    category: 'FX',
    latestPrice: '1.08450',
    priceChange: '+0.45%',
    biasDirection: 'Bullish',
    biasConfidence: 85,
    sentiment: 72,
    spread: '0.8',
    volume: '1.2M',
    news: 'Today 13:30 – USD CPI (High Impact)',
    insight: 'Testing 1.0850 resistance level'
  },
  {
    symbol: 'GBPUSD',
    displayName: 'GBP/USD',
    category: 'FX',
    latestPrice: '1.26520',
    priceChange: '+0.32%',
    biasDirection: 'Bullish',
    biasConfidence: 78,
    sentiment: 68,
    spread: '1.2',
    volume: '980K',
    news: 'Today 14:00 – GBP Retail Sales',
    insight: 'Above D1 support, momentum building'
  },
  {
    symbol: 'USDJPY',
    displayName: 'USD/JPY',
    category: 'FX',
    latestPrice: '148.250',
    priceChange: '-0.28%',
    biasDirection: 'Bearish',
    biasConfidence: 82,
    sentiment: -65,
    spread: '0.9',
    volume: '1.5M',
    news: 'Tomorrow 08:00 – JPY GDP',
    insight: 'Rejection from 149.00 resistance'
  },
  {
    symbol: 'XAUUSD',
    displayName: 'Gold/USD',
    category: 'Commodities',
    latestPrice: '2025.50',
    priceChange: '+1.24%',
    biasDirection: 'Bullish',
    biasConfidence: 91,
    sentiment: 88,
    spread: '2.5',
    volume: '850K',
    news: 'Today 15:30 – Gold Futures Report',
    insight: 'Strong momentum toward 2035'
  },
  {
    symbol: 'BTCUSD',
    displayName: 'Bitcoin/USD',
    category: 'Crypto',
    latestPrice: '37245.00',
    priceChange: '+2.15%',
    biasDirection: 'Bullish',
    biasConfidence: 76,
    sentiment: 65,
    spread: '15.0',
    volume: '2.3M',
    news: 'Today 12:00 – BTC ETF Decision',
    insight: 'Consolidating above 37K support'
  },
  {
    symbol: 'AUDUSD',
    displayName: 'AUD/USD',
    category: 'FX',
    latestPrice: '0.65420',
    priceChange: '+0.05%',
    biasDirection: 'Neutral',
    biasConfidence: 45,
    sentiment: 12,
    spread: '1.0',
    volume: '620K',
    news: 'Tomorrow 10:30 – AUD Employment',
    insight: 'Range-bound between 0.6500-0.6580'
  },
  {
    symbol: 'USDCAD',
    displayName: 'USD/CAD',
    category: 'FX',
    latestPrice: '1.35820',
    priceChange: '-0.18%',
    biasDirection: 'Bearish',
    biasConfidence: 73,
    sentiment: -58,
    spread: '1.1',
    volume: '740K',
    news: 'Today 16:00 – CAD Inflation',
    insight: 'Breakdown below 1.3600 support'
  },
  {
    symbol: 'SPX500',
    displayName: 'S&P 500',
    category: 'Indices',
    latestPrice: '4587.20',
    priceChange: '+0.85%',
    biasDirection: 'Bullish',
    biasConfidence: 80,
    sentiment: 70,
    spread: '0.5',
    volume: '3.1M',
    news: 'Today 11:00 – US Market Open',
    insight: 'New highs, momentum continues'
  },
  {
    symbol: 'ETHUSD',
    displayName: 'Ethereum/USD',
    category: 'Crypto',
    latestPrice: '2045.30',
    priceChange: '+0.45%',
    biasDirection: 'Neutral',
    biasConfidence: 55,
    sentiment: 15,
    spread: '8.0',
    volume: '1.8M',
    news: 'Today 18:00 – ETH Network Update',
    insight: 'Awaiting network upgrade catalyst'
  },
  {
    symbol: 'NZDUSD',
    displayName: 'NZD/USD',
    category: 'FX',
    latestPrice: '0.61250',
    priceChange: '-0.12%',
    biasDirection: 'Bearish',
    biasConfidence: 55,
    sentiment: -32,
    spread: '1.3',
    volume: '420K',
    news: 'Tomorrow 09:00 – NZD Trade Balance',
    insight: 'Testing weekly support zone'
  },
  {
    symbol: 'US30',
    displayName: 'Dow Jones 30',
    category: 'Indices',
    latestPrice: '37580.00',
    priceChange: '+0.62%',
    biasDirection: 'Bullish',
    biasConfidence: 75,
    sentiment: 58,
    spread: '2.0',
    volume: '2.8M',
    news: 'Today 11:00 – US Market Open',
    insight: 'Following S&P 500 breakout'
  },
  {
    symbol: 'NAS100',
    displayName: 'Nasdaq 100',
    category: 'Indices',
    latestPrice: '16245.00',
    priceChange: '+1.12%',
    biasDirection: 'Bullish',
    biasConfidence: 83,
    sentiment: 75,
    spread: '1.5',
    volume: '2.5M',
    news: 'Today 11:00 – US Market Open',
    insight: 'Tech rally continues'
  },
  {
    symbol: 'XAGUSD',
    displayName: 'Silver/USD',
    category: 'Commodities',
    latestPrice: '23.45',
    priceChange: '+0.95%',
    biasDirection: 'Bullish',
    biasConfidence: 72,
    sentiment: 62,
    spread: '0.03',
    volume: '520K',
    news: 'Today 15:30 – Precious Metals Report',
    insight: 'Following gold momentum'
  },
  {
    symbol: 'USOIL',
    displayName: 'Crude Oil',
    category: 'Commodities',
    latestPrice: '72.85',
    priceChange: '-0.45%',
    biasDirection: 'Bearish',
    biasConfidence: 65,
    sentiment: -42,
    spread: '0.04',
    volume: '1.1M',
    news: 'Today 17:00 – EIA Crude Inventories',
    insight: 'Demand concerns weigh'
  }
];

// Helper to get asset by symbol
export function getAssetBySymbol(symbol: string): Asset | undefined {
  return assetsData.find(asset => asset.symbol === symbol);
}

// Helper to get assets by category
export function getAssetsByCategory(category: AssetCategory): Asset[] {
  return assetsData.filter(asset => asset.category === category);
}

// Helper to get all asset symbols
export function getAllAssetSymbols(): string[] {
  return assetsData.map(asset => asset.symbol);
}

// Default assets to show when watchlist is empty (Dashboard bias snapshot)
export const defaultDashboardAssets = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'];

// Extract currencies from asset symbols for alert relevance
export function extractCurrenciesFromSymbol(symbol: string): string[] {
  const currencyMap: Record<string, string[]> = {
    'EURUSD': ['EUR', 'USD'],
    'GBPUSD': ['GBP', 'USD'],
    'USDJPY': ['USD', 'JPY'],
    'AUDUSD': ['AUD', 'USD'],
    'USDCAD': ['USD', 'CAD'],
    'NZDUSD': ['NZD', 'USD'],
    'XAUUSD': ['XAU', 'USD'],
    'XAGUSD': ['XAG', 'USD'],
    'BTCUSD': ['BTC', 'USD'],
    'ETHUSD': ['ETH', 'USD'],
    'SPX500': ['USD'],
    'US30': ['USD'],
    'NAS100': ['USD'],
    'USOIL': ['USD'],
  };
  return currencyMap[symbol] || [];
}

// Get unique currencies from a list of asset symbols
export function getCurrenciesFromWatchlist(watchlist: string[]): string[] {
  const currencies = new Set<string>();
  watchlist.forEach(symbol => {
    extractCurrenciesFromSymbol(symbol).forEach(currency => currencies.add(currency));
  });
  return Array.from(currencies);
}
