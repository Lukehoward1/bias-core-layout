// Trading instrument metadata for risk calculations
// Single source of truth for pip/tick values, contract sizes, and instrument types

export type InstrumentType = 'FX' | 'Futures' | 'Crypto' | 'Index' | 'Commodity';

export interface TradingInstrument {
  symbol: string;
  displayName: string;
  type: InstrumentType;
  // Pip/Tick value in account currency (GBP) per standard lot/contract
  pipValue: number;
  // Size of one pip/tick in price terms
  pipSize: number;
  // Contract size (standard lot for FX, 1 contract for futures)
  contractSize: number;
  // Minimum lot/contract increment
  minIncrement: number;
  // Label for the unit (pips, ticks, points)
  unitLabel: string;
}

// FX pairs - pip values are approximate for GBP accounts
export const fxInstruments: TradingInstrument[] = [
  {
    symbol: 'EURUSD',
    displayName: 'EUR/USD',
    type: 'FX',
    pipValue: 7.90, // ~$10 per pip converted to GBP
    pipSize: 0.0001,
    contractSize: 100000,
    minIncrement: 0.01,
    unitLabel: 'pips',
  },
  {
    symbol: 'GBPUSD',
    displayName: 'GBP/USD',
    type: 'FX',
    pipValue: 7.90,
    pipSize: 0.0001,
    contractSize: 100000,
    minIncrement: 0.01,
    unitLabel: 'pips',
  },
  {
    symbol: 'USDJPY',
    displayName: 'USD/JPY',
    type: 'FX',
    pipValue: 7.20, // Varies with JPY rate
    pipSize: 0.01,
    contractSize: 100000,
    minIncrement: 0.01,
    unitLabel: 'pips',
  },
  {
    symbol: 'AUDUSD',
    displayName: 'AUD/USD',
    type: 'FX',
    pipValue: 7.90,
    pipSize: 0.0001,
    contractSize: 100000,
    minIncrement: 0.01,
    unitLabel: 'pips',
  },
  {
    symbol: 'USDCAD',
    displayName: 'USD/CAD',
    type: 'FX',
    pipValue: 5.85, // Varies with CAD rate
    pipSize: 0.0001,
    contractSize: 100000,
    minIncrement: 0.01,
    unitLabel: 'pips',
  },
  {
    symbol: 'NZDUSD',
    displayName: 'NZD/USD',
    type: 'FX',
    pipValue: 7.90,
    pipSize: 0.0001,
    contractSize: 100000,
    minIncrement: 0.01,
    unitLabel: 'pips',
  },
  {
    symbol: 'XAUUSD',
    displayName: 'Gold (XAU/USD)',
    type: 'Commodity',
    pipValue: 0.79, // Per 0.01 move per 0.01 lot
    pipSize: 0.01,
    contractSize: 100,
    minIncrement: 0.01,
    unitLabel: 'pips',
  },
  {
    symbol: 'XAGUSD',
    displayName: 'Silver (XAG/USD)',
    type: 'Commodity',
    pipValue: 0.40,
    pipSize: 0.001,
    contractSize: 5000,
    minIncrement: 0.01,
    unitLabel: 'pips',
  },
];

// Futures contracts - tick values for standard contracts
export const futuresInstruments: TradingInstrument[] = [
  {
    symbol: 'ES',
    displayName: 'E-mini S&P 500',
    type: 'Futures',
    pipValue: 9.875, // $12.50 per tick in GBP
    pipSize: 0.25,
    contractSize: 1,
    minIncrement: 1,
    unitLabel: 'ticks',
  },
  {
    symbol: 'NQ',
    displayName: 'E-mini Nasdaq 100',
    type: 'Futures',
    pipValue: 3.95, // $5 per tick in GBP
    pipSize: 0.25,
    contractSize: 1,
    minIncrement: 1,
    unitLabel: 'ticks',
  },
  {
    symbol: 'MES',
    displayName: 'Micro E-mini S&P 500',
    type: 'Futures',
    pipValue: 0.9875, // $1.25 per tick in GBP
    pipSize: 0.25,
    contractSize: 1,
    minIncrement: 1,
    unitLabel: 'ticks',
  },
  {
    symbol: 'MNQ',
    displayName: 'Micro E-mini Nasdaq 100',
    type: 'Futures',
    pipValue: 0.395, // $0.50 per tick in GBP
    pipSize: 0.25,
    contractSize: 1,
    minIncrement: 1,
    unitLabel: 'ticks',
  },
  {
    symbol: 'CL',
    displayName: 'Crude Oil',
    type: 'Futures',
    pipValue: 7.90, // $10 per tick in GBP
    pipSize: 0.01,
    contractSize: 1,
    minIncrement: 1,
    unitLabel: 'ticks',
  },
  {
    symbol: 'GC',
    displayName: 'Gold Futures',
    type: 'Futures',
    pipValue: 7.90, // $10 per tick in GBP
    pipSize: 0.10,
    contractSize: 1,
    minIncrement: 1,
    unitLabel: 'ticks',
  },
  {
    symbol: 'YM',
    displayName: 'E-mini Dow',
    type: 'Futures',
    pipValue: 3.95, // $5 per tick in GBP
    pipSize: 1,
    contractSize: 1,
    minIncrement: 1,
    unitLabel: 'ticks',
  },
  {
    symbol: 'RTY',
    displayName: 'E-mini Russell 2000',
    type: 'Futures',
    pipValue: 3.95, // $5 per tick in GBP
    pipSize: 0.10,
    contractSize: 1,
    minIncrement: 1,
    unitLabel: 'ticks',
  },
];

// Combined list for easy access
export const allInstruments: TradingInstrument[] = [
  ...fxInstruments,
  ...futuresInstruments,
];

// Helper functions
export function getInstrumentBySymbol(symbol: string): TradingInstrument | undefined {
  return allInstruments.find(i => i.symbol === symbol);
}

export function getInstrumentsByType(type: InstrumentType): TradingInstrument[] {
  return allInstruments.filter(i => i.type === type);
}

export function getFXInstruments(): TradingInstrument[] {
  return allInstruments.filter(i => i.type === 'FX' || i.type === 'Commodity');
}

export function getFuturesInstruments(): TradingInstrument[] {
  return allInstruments.filter(i => i.type === 'Futures');
}

// Calculate position size based on risk parameters
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  stopDistance: number,
  instrument: TradingInstrument
): { positionSize: number; riskAmount: number; formattedSize: string } {
  const riskAmount = (accountBalance * riskPercent) / 100;
  const riskPerUnit = stopDistance * instrument.pipValue;
  
  let positionSize = 0;
  if (riskPerUnit > 0) {
    positionSize = riskAmount / riskPerUnit;
  }
  
  // Round to minimum increment
  positionSize = Math.floor(positionSize / instrument.minIncrement) * instrument.minIncrement;
  
  // Format the size appropriately
  let formattedSize: string;
  if (instrument.type === 'Futures') {
    formattedSize = `${positionSize.toFixed(0)} contract${positionSize !== 1 ? 's' : ''}`;
  } else {
    formattedSize = `${positionSize.toFixed(2)} lots`;
  }
  
  return {
    positionSize,
    riskAmount,
    formattedSize,
  };
}
