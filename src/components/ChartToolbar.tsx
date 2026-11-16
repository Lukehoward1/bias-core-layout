import { Button } from '@/components/ui/button';
import { Crosshair, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndicatorSelector } from './chart/IndicatorSelector';
import { ChartStyleSelector, ChartStyle } from './chart/ChartStyleSelector';
import { ReplayModePanel } from './chart/ReplayModePanel';
import { SavedBacktestsDropdown, SavedBacktest } from './chart/SavedBacktestsDropdown';

interface ChartToolbarProps {
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  crosshairEnabled: boolean;
  onCrosshairToggle: (enabled: boolean) => void;
  ohlcEnabled: boolean;
  onOhlcToggle: (enabled: boolean) => void;
  chartStyle: ChartStyle;
  onChartStyleChange: (style: ChartStyle) => void;
  activeIndicators: string[];
  onToggleIndicator: (id: string) => void;
  onRemoveIndicator: (id: string) => void;
  savedBacktests?: SavedBacktest[];
  onSaveBacktest?: () => void;
  onLoadBacktest?: (id: string) => void;
  onCompareBacktests?: (ids: string[]) => void;
}

const timeframes = [
  { value: 'm1', label: '1m' },
  { value: 'm5', label: '5m' },
  { value: 'm15', label: '15m' },
  { value: 'h1', label: '1H' },
  { value: 'h4', label: '4H' },
  { value: 'd1', label: '1D' },
];


export function ChartToolbar({
  timeframe,
  onTimeframeChange,
  crosshairEnabled,
  onCrosshairToggle,
  ohlcEnabled,
  onOhlcToggle,
  chartStyle,
  onChartStyleChange,
  activeIndicators,
  onToggleIndicator,
  onRemoveIndicator,
  savedBacktests = [],
  onSaveBacktest,
  onLoadBacktest,
  onCompareBacktests,
}: ChartToolbarProps) {
  return (
    <div className="h-11 px-3 bg-background/95 backdrop-blur-sm border-b border-border/50 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center gap-2 h-full min-w-max lg:min-w-0 lg:w-full">
        {/* Left: Timeframe buttons + Chart Style */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs font-medium",
                  timeframe === tf.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onClick={() => onTimeframeChange(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>

          <div className="h-4 w-px bg-border/50" />

          {/* Chart Style Selector */}
          <ChartStyleSelector value={chartStyle} onChange={onChartStyleChange} />

          <div className="h-4 w-px bg-border/50" />

          {/* Saved Backtests Dropdown */}
          {onSaveBacktest && (
            <SavedBacktestsDropdown
              savedBacktests={savedBacktests}
              onSave={onSaveBacktest}
              onLoad={onLoadBacktest || (() => {})}
              onCompare={onCompareBacktests || (() => {})}
            />
          )}
        </div>

        {/* Spacer — pushes right group to far right on desktop */}
        <div className="hidden lg:flex flex-1" />

        {/* Right: Icon controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Replay Mode */}
          <ReplayModePanel />

          <div className="h-4 w-px bg-border/50 mx-1" />

          {/* Indicators Button */}
          <IndicatorSelector
            activeIndicators={activeIndicators}
            onToggleIndicator={onToggleIndicator}
            onRemoveIndicator={onRemoveIndicator}
          />

          <div className="h-4 w-px bg-border/50 mx-1" />

          {/* Crosshair toggle */}
          <Button
            variant={crosshairEnabled ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "h-6 w-6 p-0",
              crosshairEnabled
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onCrosshairToggle(!crosshairEnabled)}
            title="Toggle crosshair"
          >
            <Crosshair className="h-3.5 w-3.5" />
          </Button>

          {/* OHLC toggle */}
          <Button
            variant={ohlcEnabled ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "h-6 px-1.5 text-xs font-medium gap-1",
              ohlcEnabled
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onOhlcToggle(!ohlcEnabled)}
            title="Show OHLC on Hover"
          >
            <Info className="h-3 w-3" />
            OHLC
          </Button>
        </div>
      </div>
    </div>
  );
}
