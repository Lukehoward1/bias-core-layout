export type AssetCategory = "forex" | "index" | "commodity" | "crypto";

export type Asset = {
  symbol: string;
  name: string;
  category: AssetCategory;
  base?: string;
  quote?: string;
  aliases?: string[];
};

export const ASSETS: Asset[] = [
  // ===== FOREX =====
  { symbol: "EURUSD", name: "EUR/USD", category: "forex", base: "EUR", quote: "USD" },
  { symbol: "USDJPY", name: "USD/JPY", category: "forex", base: "USD", quote: "JPY" },
  { symbol: "GBPUSD", name: "GBP/USD", category: "forex", base: "GBP", quote: "USD" },
  { symbol: "AUDUSD", name: "AUD/USD", category: "forex", base: "AUD", quote: "USD" },
  { symbol: "USDCAD", name: "USD/CAD", category: "forex", base: "USD", quote: "CAD" },
  { symbol: "NZDUSD", name: "NZD/USD", category: "forex", base: "NZD", quote: "USD" },
  { symbol: "USDCHF", name: "USD/CHF", category: "forex", base: "USD", quote: "CHF" },
  { symbol: "EURGBP", name: "EUR/GBP", category: "forex", base: "EUR", quote: "GBP" },
  { symbol: "EURJPY", name: "EUR/JPY", category: "forex", base: "EUR", quote: "JPY" },
  { symbol: "GBPJPY", name: "GBP/JPY", category: "forex", base: "GBP", quote: "JPY" },
  { symbol: "EURAUD", name: "EUR/AUD", category: "forex", base: "EUR", quote: "AUD" },
  { symbol: "AUDJPY", name: "AUD/JPY", category: "forex", base: "AUD", quote: "JPY" },
  { symbol: "GBPCHF", name: "GBP/CHF", category: "forex", base: "GBP", quote: "CHF" },
  { symbol: "EURCAD", name: "EUR/CAD", category: "forex", base: "EUR", quote: "CAD" },
  { symbol: "CADJPY", name: "CAD/JPY", category: "forex", base: "CAD", quote: "JPY" },
  { symbol: "NZDJPY", name: "NZD/JPY", category: "forex", base: "NZD", quote: "JPY" },
  { symbol: "AUDCAD", name: "AUD/CAD", category: "forex", base: "AUD", quote: "CAD" },
  { symbol: "EURCHF", name: "EUR/CHF", category: "forex", base: "EUR", quote: "CHF" },
  { symbol: "CHFJPY", name: "CHF/JPY", category: "forex", base: "CHF", quote: "JPY" },
  { symbol: "GBPAUD", name: "GBP/AUD", category: "forex", base: "GBP", quote: "AUD" },
  // ===== INDICES =====
  { symbol: "SPX500", name: "S&P 500", category: "index", aliases: ["US500", "SP500", "SPX"] },
  { symbol: "NAS100", name: "NASDAQ 100", category: "index", aliases: ["US100", "NDX"] },
  { symbol: "US30", name: "Dow Jones", category: "index", aliases: ["DJI", "DOW"] },
  { symbol: "GER40", name: "DAX 40", category: "index", aliases: ["DAX", "DE40"] },
  { symbol: "UK100", name: "FTSE 100", category: "index", aliases: ["FTSE"] },
  { symbol: "JPN225", name: "Nikkei 225", category: "index", aliases: ["JP225"] },
  { symbol: "FRA40", name: "CAC 40", category: "index" },
  { symbol: "EUSTX50", name: "Euro Stoxx 50", category: "index" },
  { symbol: "AUS200", name: "ASX 200", category: "index" },
  { symbol: "HK50", name: "Hang Seng", category: "index" },
  { symbol: "US2000", name: "Russell 2000", category: "index" },
  { symbol: "CA60", name: "TSX Composite", category: "index" },
  // ===== COMMODITIES =====
  { symbol: "USOIL", name: "WTI Crude Oil", category: "commodity" },
  { symbol: "UKOIL", name: "Brent Crude Oil", category: "commodity" },
  { symbol: "XAUUSD", name: "Gold", category: "commodity", base: "XAU", quote: "USD" },
  { symbol: "XAGUSD", name: "Silver", category: "commodity", base: "XAG", quote: "USD" },
  { symbol: "NATGAS", name: "Natural Gas", category: "commodity" },
  { symbol: "COPPER", name: "Copper", category: "commodity" },
  { symbol: "XPTUSD", name: "Platinum", category: "commodity" },
  { symbol: "XPDUSD", name: "Palladium", category: "commodity" },
  { symbol: "CORN", name: "Corn", category: "commodity" },
  { symbol: "SOYBEAN", name: "Soybeans", category: "commodity" },
  // ===== CRYPTO =====
  { symbol: "BTCUSD", name: "Bitcoin", category: "crypto", base: "BTC", quote: "USD" },
  { symbol: "ETHUSD", name: "Ethereum", category: "crypto", base: "ETH", quote: "USD" },
  { symbol: "USDTUSD", name: "Tether", category: "crypto" },
  { symbol: "BNBUSD", name: "BNB", category: "crypto" },
  { symbol: "USDCUSD", name: "USD Coin", category: "crypto" },
  { symbol: "XRPUSD", name: "XRP", category: "crypto" },
  { symbol: "ADAUSD", name: "Cardano", category: "crypto" },
  { symbol: "SOLUSD", name: "Solana", category: "crypto" },
  { symbol: "DOGEUSD", name: "Dogecoin", category: "crypto" },
  { symbol: "MATICUSD", name: "Polygon", category: "crypto" },
  { symbol: "LTCUSD", name: "Litecoin", category: "crypto" },
  { symbol: "DOTUSD", name: "Polkadot", category: "crypto" },
  { symbol: "SHIBUSD", name: "Shiba Inu", category: "crypto" },
  { symbol: "TRXUSD", name: "Tron", category: "crypto" },
  { symbol: "AVAXUSD", name: "Avalanche", category: "crypto" },
];

export const ASSET_BY_SYMBOL = Object.fromEntries(
  ASSETS.map((asset) => [asset.symbol, asset]),
) as Record<string, Asset>;
