import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Crosshair, 
  PencilRuler, 
  TrendingUp,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  MoreHorizontal,
  Check
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ChartToolbarProps {
  pair: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  crosshairEnabled: boolean;
  onCrosshairToggle: (enabled: boolean) => void;
}

const timeframes = [
  { value: 'm1', label: '1m' },
  { value: 'm5', label: '5m' },
  { value: 'm15', label: '15m' },
  { value: 'h1', label: '1H' },
  { value: 'h4', label: '4H' },
  { value: 'd1', label: '1D' },
];

const moreTimeframes = [
  { value: 'w1', label: '1W' },
  { value: 'mn1', label: '1M' },
];

const indicators = [
  { id: 'ma', name: 'Moving Average', description: 'Simple/Exponential MA overlay' },
  { id: 'rsi', name: 'RSI', description: 'Relative Strength Index' },
  { id: 'atr', name: 'ATR', description: 'Average True Range' },
];

const pairLabels: Record<string, string> = {
  eurusd: 'EURUSD',
  gbpusd: 'GBPUSD',
  usdjpy: 'USDJPY',
  xauusd: 'XAUUSD',
};

const timeframeLabels: Record<string, string> = {
  m1: '1m',
  m5: '5m',
  m15: '15m',
  h1: '1H',
  h4: '4H',
  d1: '1D',
  w1: '1W',
  mn1: '1M',
};

export function ChartToolbar({
  pair,
  timeframe,
  onTimeframeChange,
  onZoomIn,
  onZoomOut,
  onReset,
  crosshairEnabled,
  onCrosshairToggle,
}: ChartToolbarProps) {
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-background/80 backdrop-blur-sm border-b border-border/50">
      {/* Left: Timeframe buttons */}
      <div className="flex items-center gap-1">
        {timeframes.map((tf) => (
          <Button
            key={tf.value}
            variant={timeframe === tf.value ? 'default' : 'ghost'}
            size="sm"
            className={`h-7 px-2.5 text-xs font-medium ${
              timeframe === tf.value 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            onClick={() => onTimeframeChange(tf.value)}
          >
            {tf.label}
          </Button>
        ))}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-card border-border">
            {moreTimeframes.map((tf) => (
              <DropdownMenuItem 
                key={tf.value}
                className="text-muted-foreground cursor-not-allowed opacity-50"
              >
                {tf.label} <span className="ml-2 text-xs">(Coming Soon)</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center: Symbol + Timeframe label */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        <span className="text-sm font-semibold text-foreground">
          {pairLabels[pair] || pair.toUpperCase()}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">
          {timeframeLabels[timeframe] || timeframe.toUpperCase()}
        </span>
      </div>

      {/* Right: Icon controls */}
      <div className="flex items-center gap-1">
        {/* Crosshair toggle */}
        <Button
          variant={crosshairEnabled ? 'default' : 'ghost'}
          size="sm"
          className={`h-7 w-7 p-0 ${
            crosshairEnabled 
              ? 'bg-primary/20 text-primary border border-primary/30' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onCrosshairToggle(!crosshairEnabled)}
          title="Toggle crosshair"
        >
          <Crosshair className="h-4 w-4" />
        </Button>

        {/* Drawing tools */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Drawing tools"
            >
              <PencilRuler className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 bg-card border-border p-3">
            <div className="text-sm font-medium text-foreground mb-2">Drawing Tools</div>
            <p className="text-xs text-muted-foreground">
              Advanced drawing tools coming soon. You'll be able to draw trendlines, support/resistance levels, and more.
            </p>
          </PopoverContent>
        </Popover>

        {/* Indicators */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Indicators"
            >
              <TrendingUp className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 bg-card border-border p-3">
            <div className="text-sm font-medium text-foreground mb-3">Indicators</div>
            <div className="space-y-3">
              {indicators.map((indicator) => (
                <div key={indicator.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-foreground flex items-center gap-2">
                      {indicator.name}
                      {activeIndicators.includes(indicator.id) && (
                        <Check className="h-3 w-3 text-success" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{indicator.description}</div>
                  </div>
                  <Switch
                    checked={activeIndicators.includes(indicator.id)}
                    onCheckedChange={() => toggleIndicator(indicator.id)}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
              Indicator overlays are visual only in demo mode.
            </p>
          </PopoverContent>
        </Popover>

        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* Zoom controls */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={onZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={onZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={onReset}
          title="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
