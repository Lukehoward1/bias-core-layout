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
  { symbol: "EURUSD", name: "EUR/USD", category: "forex", base: "EUR", quote: "USD", aliases: ["EUR/USD"] },
  { symbol: "USDJPY", name: "USD/JPY", category: "forex", base: "USD", quote: "JPY", aliases: ["USD/JPY"] },
  { symbol: "GBPUSD", name: "GBP/USD", category: "forex", base: "GBP", quote: "USD", aliases: ["GBP/USD"] },
  { symbol: "AUDUSD", name: "AUD/USD", category: "forex", base: "AUD", quote: "USD", aliases: ["AUD/USD"] },
  { symbol: "USDCAD", name: "USD/CAD", category: "forex", base: "USD", quote: "CAD", aliases: ["USD/CAD"] },
  { symbol: "NZDUSD", name: "NZD/USD", category: "forex", base: "NZD", quote: "USD", aliases: ["NZD/USD"] },
  { symbol: "USDCHF", name: "USD/CHF", category: "forex", base: "USD", quote: "CHF", aliases: ["USD/CHF"] },
  { symbol: "EURGBP", name: "EUR/GBP", category: "forex", base: "EUR", quote: "GBP", aliases: ["EUR/GBP"] },
  { symbol: "EURJPY", name: "EUR/JPY", category: "forex", base: "EUR", quote: "JPY", aliases: ["EUR/JPY"] },
  { symbol: "GBPJPY", name: "GBP/JPY", category: "forex", base: "GBP", quote: "JPY", aliases: ["GBP/JPY"] },

  // ===== INDICES =====
  { symbol: "SPX500", name: "S&P 500", category: "index", aliases: ["US500", "SP500", "SPX"] },
  { symbol: "NAS100", name: "NASDAQ 100", category: "index", aliases: ["US100", "NDX"] },
  { symbol: "US30", name: "Dow Jones", category: "index", aliases: ["DJI", "DOW"] },
  { symbol: "GER40", name: "DAX 40", category: "index", aliases: ["DAX", "DE40"] },
  { symbol: "UK100", name: "FTSE 100", category: "index", aliases: ["FTSE"] },
  { symbol: "JPN225", name: "Nikkei 225", category: "index", aliases: ["JP225"] },

  // ✅ ADD BASE CURRENCY (CRITICAL FOR IMPACT ENGINE)
  { symbol: "FRA40", name: "CAC 40", category: "index", base: "EUR" },
  { symbol: "EUSTX50", name: "Euro Stoxx 50", category: "index", base: "EUR" },
  { symbol: "AUS200", name: "ASX 200", category: "index", base: "AUD" },
  { symbol: "HK50", name: "Hang Seng", category: "index", base: "HKD" },
  { symbol: "US2000", name: "Russell 2000", category: "index", base: "USD" },
  { symbol: "CA60", name: "TSX Composite", category: "index", base: "CAD" },

  // ===== COMMODITIES =====
  { symbol: "USOIL", name: "WTI Crude Oil", category: "commodity", base: "USD" },
  { symbol: "UKOIL", name: "Brent Crude Oil", category: "commodity", base: "USD" },
  { symbol: "XAUUSD", name: "Gold", category: "commodity", base: "XAU", quote: "USD" },
  { symbol: "XAGUSD", name: "Silver", category: "commodity", base: "XAG", quote: "USD" },
  { symbol: "NATGAS", name: "Natural Gas", category: "commodity", base: "USD" },
  { symbol: "COPPER", name: "Copper", category: "commodity", base: "USD" },
  { symbol: "XPTUSD", name: "Platinum", category: "commodity", base: "XPT", quote: "USD" },
  { symbol: "XPDUSD", name: "Palladium", category: "commodity", base: "XPD", quote: "USD" },

  // ===== CRYPTO =====
  { symbol: "BTCUSD", name: "Bitcoin", category: "crypto", base: "BTC", quote: "USD" },
  { symbol: "ETHUSD", name: "Ethereum", category: "crypto", base: "ETH", quote: "USD" },
  { symbol: "XRPUSD", name: "XRP", category: "crypto", base: "XRP", quote: "USD" },
  { symbol: "SOLUSD", name: "Solana", category: "crypto", base: "SOL", quote: "USD" },
  { symbol: "DOGEUSD", name: "Dogecoin", category: "crypto", base: "DOGE", quote: "USD" },
  { symbol: "LTCUSD", name: "Litecoin", category: "crypto", base: "LTC", quote: "USD" },
];

// 🔥 IMPROVED LOOKUP (includes aliases automatically)
export const ASSET_BY_SYMBOL: Record<string, Asset> = (() => {
  const map: Record<string, Asset> = {};

  for (const asset of ASSETS) {
    map[asset.symbol] = asset;

    if (asset.aliases) {
      for (const alias of asset.aliases) {
        map[alias.toUpperCase()] = asset;
        map[alias.replace("/", "").toUpperCase()] = asset;
      }
    }
  }

  return map;
})();
