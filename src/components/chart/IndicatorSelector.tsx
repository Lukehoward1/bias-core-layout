import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Activity, Search, ChevronRight, X, Check, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Indicator {
  id: string;
  name: string;
  category: string;
  description: string;
  type: 'overlay' | 'panel'; // overlay = on chart, panel = below chart
}

const indicatorCategories = [
  {
    name: 'Trend Indicators',
    indicators: [
      { id: 'sma', name: 'Simple Moving Average (SMA)', description: 'Average price over N periods', type: 'overlay' as const },
      { id: 'ema', name: 'Exponential Moving Average (EMA)', description: 'Weighted average giving more weight to recent prices', type: 'overlay' as const },
      { id: 'wma', name: 'Weighted Moving Average (WMA)', description: 'Linear weighted average', type: 'overlay' as const },
      { id: 'hma', name: 'Hull Moving Average (HMA)', description: 'Smoother, more responsive MA', type: 'overlay' as const },
      { id: 'ma-ribbon', name: 'Moving Average Ribbon', description: 'Multiple MAs displayed together', type: 'overlay' as const },
      { id: 'ichimoku', name: 'Ichimoku Cloud', description: 'Multiple trend & support indicators', type: 'overlay' as const },
      { id: 'parabolic-sar', name: 'Parabolic SAR', description: 'Stop and reverse indicator', type: 'overlay' as const },
      { id: 'supertrend', name: 'SuperTrend', description: 'ATR-based trend following', type: 'overlay' as const },
      { id: 'donchian', name: 'Donchian Channels', description: 'Highest high / lowest low channels', type: 'overlay' as const },
      { id: 'pivot-points', name: 'Pivot Points (Classic, Fibonacci, Woodie)', description: 'Support/resistance levels', type: 'overlay' as const },
    ],
  },
  {
    name: 'Momentum Indicators',
    indicators: [
      { id: 'rsi', name: 'Relative Strength Index (RSI)', description: 'Momentum oscillator (0-100)', type: 'panel' as const },
      { id: 'stochastic', name: 'Stochastic Oscillator', description: 'Price position within range', type: 'panel' as const },
      { id: 'macd', name: 'MACD', description: 'Moving Average Convergence Divergence', type: 'panel' as const },
      { id: 'cci', name: 'Commodity Channel Index (CCI)', description: 'Cyclical trend indicator', type: 'panel' as const },
      { id: 'williams-r', name: 'Williams %R', description: 'Overbought/oversold oscillator', type: 'panel' as const },
      { id: 'momentum', name: 'Momentum Indicator', description: 'Rate of price change', type: 'panel' as const },
      { id: 'chaikin-osc', name: 'Chaikin Oscillator', description: 'A/D line momentum', type: 'panel' as const },
      { id: 'trix', name: 'TRIX', description: 'Triple smoothed EMA oscillator', type: 'panel' as const },
      { id: 'awesome-osc', name: 'Awesome Oscillator', description: 'Market momentum indicator', type: 'panel' as const },
      { id: 'roc', name: 'Rate of Change (ROC)', description: 'Percentage price change', type: 'panel' as const },
    ],
  },
  {
    name: 'Volatility Indicators',
    indicators: [
      { id: 'atr', name: 'Average True Range (ATR)', description: 'Average volatility measure', type: 'panel' as const },
      { id: 'bollinger', name: 'Bollinger Bands', description: 'Standard deviation bands', type: 'overlay' as const },
      { id: 'keltner', name: 'Keltner Channels', description: 'ATR-based envelope', type: 'overlay' as const },
      { id: 'vix-proxy', name: 'Volatility Index (VIX Proxy)', description: 'Implied volatility estimate', type: 'panel' as const },
      { id: 'donchian-vol', name: 'Donchian Volatility Bands', description: 'Range-based volatility', type: 'overlay' as const },
      { id: 'chaikin-vol', name: 'Chaikin Volatility', description: 'Rate of change of ATR', type: 'panel' as const },
      { id: 'historical-vol', name: 'Historical Volatility', description: 'Annualized standard deviation', type: 'panel' as const },
    ],
  },
  {
    name: 'Volume Indicators',
    indicators: [
      { id: 'volume', name: 'Raw Volume', description: 'Basic volume bars', type: 'panel' as const },
      { id: 'obv', name: 'On-Balance Volume (OBV)', description: 'Cumulative volume flow', type: 'panel' as const },
      { id: 'volume-profile', name: 'Volume Profile (Visible Range)', description: 'Volume at price levels', type: 'overlay' as const },
      { id: 'mfi', name: 'Money Flow Index (MFI)', description: 'Volume-weighted RSI', type: 'panel' as const },
      { id: 'ad-line', name: 'Accumulation/Distribution Line', description: 'Volume flow indicator', type: 'panel' as const },
      { id: 'vwap', name: 'VWAP', description: 'Volume Weighted Average Price', type: 'overlay' as const },
      { id: 'volume-osc', name: 'Volume Oscillator', description: 'Volume momentum', type: 'panel' as const },
      { id: 'cmf', name: 'Chaikin Money Flow (CMF)', description: 'Buying/selling pressure', type: 'panel' as const },
    ],
  },
  {
    name: 'Oscillator / Hybrid Indicators',
    indicators: [
      { id: 'adx', name: 'ADX', description: 'Average Directional Index', type: 'panel' as const },
      { id: 'dmi', name: 'DMI (+DI / -DI)', description: 'Directional Movement Index', type: 'panel' as const },
      { id: 'mtf-rsi', name: 'Multi-Timeframe RSI', description: 'RSI across timeframes', type: 'panel' as const },
      { id: 'stoch-rsi', name: 'Stochastic RSI', description: 'Stochastic of RSI values', type: 'panel' as const },
      { id: 'ppo', name: 'Percentage Price Oscillator (PPO)', description: 'Normalized MACD', type: 'panel' as const },
      { id: 'pvo', name: 'Percentage Volume Oscillator (PVO)', description: 'Volume momentum', type: 'panel' as const },
      { id: 'ultimate-osc', name: 'Ultimate Oscillator', description: 'Multi-timeframe momentum', type: 'panel' as const },
      { id: 'elder-force', name: 'Elder Force Index', description: 'Price-volume momentum', type: 'panel' as const },
      { id: 'elder-ray', name: 'Elder Ray Index', description: 'Bull/bear power', type: 'panel' as const },
      { id: 'connors-rsi', name: 'Connors RSI', description: 'Composite RSI measure', type: 'panel' as const },
    ],
  },
  {
    name: 'Market Structure Tools',
    indicators: [
      { id: 'fractals', name: 'Fractals', description: 'Swing high/low markers', type: 'overlay' as const },
      { id: 'zigzag', name: 'ZigZag', description: 'Trend line connector', type: 'overlay' as const },
      { id: 'market-structure', name: 'Market Structure Breaks (BOS / CHoCH)', description: 'Break of structure detection', type: 'overlay' as const },
      { id: 'fib-retracement', name: 'Fibonacci Retracement', description: 'Auto-drawn fib levels', type: 'overlay' as const },
      { id: 'session-range', name: 'Session Range (London / NY / Asia)', description: 'Trading session highlights', type: 'overlay' as const },
    ],
  },
];

// Flatten all indicators with category info
const allIndicators: Indicator[] = indicatorCategories.flatMap((cat) =>
  cat.indicators.map((ind) => ({ ...ind, category: cat.name }))
);

interface IndicatorSelectorProps {
  activeIndicators: string[];
  onToggleIndicator: (id: string) => void;
  onRemoveIndicator: (id: string) => void;
  onOpenSettings?: (id: string) => void;
}

export function IndicatorSelector({
  activeIndicators,
  onToggleIndicator,
  onRemoveIndicator,
  onOpenSettings,
}: IndicatorSelectorProps) {
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<string[]>(['Trend Indicators']);
  const [isOpen, setIsOpen] = useState(false);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return indicatorCategories;

    const lowerSearch = search.toLowerCase();
    return indicatorCategories
      .map((cat) => ({
        ...cat,
        indicators: cat.indicators.filter(
          (ind) =>
            ind.name.toLowerCase().includes(lowerSearch) ||
            ind.description.toLowerCase().includes(lowerSearch)
        ),
      }))
      .filter((cat) => cat.indicators.length > 0);
  }, [search]);

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const activeIndicatorDetails = allIndicators.filter((ind) =>
    activeIndicators.includes(ind.id)
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2.5 text-xs font-medium gap-1.5",
            activeIndicators.length > 0
              ? "bg-primary/20 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          Indicators
          {activeIndicators.length > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none">
              {activeIndicators.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] bg-card border-border p-0">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <SheetTitle className="text-foreground">Indicators</SheetTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search indicators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
        </SheetHeader>

        {/* Active Indicators */}
        {activeIndicatorDetails.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Active ({activeIndicatorDetails.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {activeIndicatorDetails.map((ind) => (
                <div
                  key={ind.id}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-2 py-1 rounded-md"
                >
                  <span>{ind.name.split(' ')[0]}</span>
                  {onOpenSettings && (
                    <button
                      onClick={() => onOpenSettings(ind.id)}
                      className="hover:bg-primary/20 rounded p-0.5"
                    >
                      <Settings2 className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveIndicator(ind.id)}
                    className="hover:bg-primary/20 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicator Categories */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-2">
            {filteredCategories.map((category) => (
              <Collapsible
                key={category.name}
                open={openCategories.includes(category.name) || search.length > 0}
                onOpenChange={() => toggleCategory(category.name)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg hover:bg-muted transition-colors">
                  <span className="text-sm font-medium text-foreground">
                    {category.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {category.indicators.length}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        (openCategories.includes(category.name) || search.length > 0) && "rotate-90"
                      )}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-2 space-y-1 mt-1">
                    {category.indicators.map((indicator) => {
                      const isActive = activeIndicators.includes(indicator.id);
                      return (
                        <button
                          key={indicator.id}
                          onClick={() => onToggleIndicator(indicator.id)}
                          className={cn(
                            "w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors",
                            isActive
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted"
                          )}
                        >
                          <div
                            className={cn(
                              "flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-0.5",
                              isActive
                                ? "bg-primary border-primary"
                                : "border-border"
                            )}
                          >
                            {isActive && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-foreground truncate">
                              {indicator.name}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {indicator.description}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              indicator.type === 'overlay'
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-purple-500/10 text-purple-400"
                            )}
                          >
                            {indicator.type === 'overlay' ? 'Chart' : 'Panel'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <p className="text-xs text-muted-foreground text-center">
            Indicator calculations are visual only in demo mode
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { allIndicators, indicatorCategories };
