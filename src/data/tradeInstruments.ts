export type AssetCategory = 'forex' | 'commodity' | 'index' | 'crypto';

export interface TradeInstrument {
  symbol: string;
  displayName: string;
  category: AssetCategory;
  pipSize: number;
  displayDecimals: number;
  providerSymbols: {
    twelvedata: string;
    fmp: string | { status: 'pending-paid-confirmation'; candidate?: string };
  };
  /** Override volume display. Undefined → use provider-aware rule (§2.5). */
  hasVolume?: boolean;
  /** Approximate typical spread in price units. Used by simulator (Stage 9). */
  typicalSpread: number;
  /** Whether 1-minute bars are available from the active provider. */
  supports1m: boolean;
}

export const TRADE_INSTRUMENTS: readonly TradeInstrument[] = [
  // FX majors — FMP daily EOD verified Stage 0 for EURUSD, GBPUSD, USDJPY
  {
    symbol: 'EURUSD',
    displayName: 'EUR/USD',
    category: 'forex',
    pipSize: 0.0001,
    displayDecimals: 5,
    providerSymbols: { twelvedata: 'EUR/USD', fmp: 'EURUSD' },
    typicalSpread: 0.0001, // TODO: calibrate per broker
    supports1m: true,
  },
  {
    symbol: 'GBPUSD',
    displayName: 'GBP/USD',
    category: 'forex',
    pipSize: 0.0001,
    displayDecimals: 5,
    providerSymbols: { twelvedata: 'GBP/USD', fmp: 'GBPUSD' },
    typicalSpread: 0.0002,
    supports1m: true,
  },
  {
    symbol: 'USDJPY',
    displayName: 'USD/JPY',
    category: 'forex',
    pipSize: 0.01,
    displayDecimals: 3,
    providerSymbols: { twelvedata: 'USD/JPY', fmp: 'USDJPY' },
    typicalSpread: 0.03,
    supports1m: true,
  },
  // FX minors — FMP symbol follows the same EURUSD pattern; not individually probed
  {
    symbol: 'USDCHF',
    displayName: 'USD/CHF',
    category: 'forex',
    pipSize: 0.0001,
    displayDecimals: 5,
    providerSymbols: { twelvedata: 'USD/CHF', fmp: 'USDCHF' },
    typicalSpread: 0.0002,
    supports1m: true,
  },
  {
    symbol: 'AUDUSD',
    displayName: 'AUD/USD',
    category: 'forex',
    pipSize: 0.0001,
    displayDecimals: 5,
    providerSymbols: { twelvedata: 'AUD/USD', fmp: 'AUDUSD' },
    typicalSpread: 0.0002,
    supports1m: true,
  },
  {
    symbol: 'USDCAD',
    displayName: 'USD/CAD',
    category: 'forex',
    pipSize: 0.0001,
    displayDecimals: 5,
    providerSymbols: { twelvedata: 'USD/CAD', fmp: 'USDCAD' },
    typicalSpread: 0.0002,
    supports1m: true,
  },
  {
    symbol: 'NZDUSD',
    displayName: 'NZD/USD',
    category: 'forex',
    pipSize: 0.0001,
    displayDecimals: 5,
    providerSymbols: { twelvedata: 'NZD/USD', fmp: 'NZDUSD' },
    typicalSpread: 0.0003,
    supports1m: true,
  },
  {
    symbol: 'EURGBP',
    displayName: 'EUR/GBP',
    category: 'forex',
    pipSize: 0.0001,
    displayDecimals: 5,
    providerSymbols: { twelvedata: 'EUR/GBP', fmp: 'EURGBP' },
    typicalSpread: 0.0002,
    supports1m: true,
  },
  {
    symbol: 'EURJPY',
    displayName: 'EUR/JPY',
    category: 'forex',
    pipSize: 0.01,
    displayDecimals: 3,
    providerSymbols: { twelvedata: 'EUR/JPY', fmp: 'EURJPY' },
    typicalSpread: 0.04,
    supports1m: true,
  },
  {
    symbol: 'GBPJPY',
    displayName: 'GBP/JPY',
    category: 'forex',
    pipSize: 0.01,
    displayDecimals: 3,
    providerSymbols: { twelvedata: 'GBP/JPY', fmp: 'GBPJPY' },
    typicalSpread: 0.06,
    supports1m: true,
  },
  // Commodities
  {
    symbol: 'XAUUSD',
    displayName: 'Gold (XAU/USD)',
    category: 'commodity',
    pipSize: 0.01,
    displayDecimals: 2,
    providerSymbols: {
      twelvedata: 'XAU/USD',
      // ⚠️ COMEX gold futures, not spot — pending product decision on relabel (Stage 0)
      fmp: 'GCUSD',
    },
    typicalSpread: 0.3,
    supports1m: true,
  },
  // Indices — FMP availability unverified on free plan; require paid confirmation
  {
    symbol: 'NAS100',
    displayName: 'Nasdaq 100',
    category: 'index',
    pipSize: 1,
    displayDecimals: 1,
    providerSymbols: {
      twelvedata: 'NASDAQ',
      fmp: { status: 'pending-paid-confirmation', candidate: '^NDX' },
    },
    typicalSpread: 2,
    supports1m: false,
  },
  {
    symbol: 'US30',
    displayName: 'Dow Jones 30',
    category: 'index',
    pipSize: 1,
    displayDecimals: 1,
    providerSymbols: {
      twelvedata: 'DJI',
      fmp: { status: 'pending-paid-confirmation' },
    },
    typicalSpread: 2,
    supports1m: false,
  },
  {
    symbol: 'GER40',
    displayName: 'DAX 40',
    category: 'index',
    pipSize: 1,
    displayDecimals: 1,
    providerSymbols: {
      twelvedata: 'GER40',
      fmp: { status: 'pending-paid-confirmation' },
    },
    typicalSpread: 2,
    supports1m: false,
  },
  {
    symbol: 'UK100',
    displayName: 'FTSE 100',
    category: 'index',
    pipSize: 1,
    displayDecimals: 1,
    providerSymbols: {
      twelvedata: 'UK100',
      fmp: { status: 'pending-paid-confirmation' },
    },
    typicalSpread: 2,
    supports1m: false,
  },
];

export function getInstrument(symbol: string): TradeInstrument | undefined {
  return TRADE_INSTRUMENTS.find((i) => i.symbol === symbol.toUpperCase());
}
