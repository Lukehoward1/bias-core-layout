import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Crosshair, 
  MoreHorizontal,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartToolbarProps {
  pair: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  crosshairEnabled: boolean;
  onCrosshairToggle: (enabled: boolean) => void;
  ohlcEnabled: boolean;
  onOhlcToggle: (enabled: boolean) => void;
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
  crosshairEnabled,
  onCrosshairToggle,
  ohlcEnabled,
  onOhlcToggle,
}: ChartToolbarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-background/80 backdrop-blur-sm border-b border-border/50">
      {/* Left: Timeframe buttons */}
      <div className="flex items-center gap-1">
        {timeframes.map((tf) => (
          <Button
            key={tf.value}
            variant={timeframe === tf.value ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "h-7 px-2.5 text-xs font-medium",
              timeframe === tf.value 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
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
          className={cn(
            "h-7 w-7 p-0",
            crosshairEnabled 
              ? 'bg-primary/20 text-primary border border-primary/30' 
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onCrosshairToggle(!crosshairEnabled)}
          title="Toggle crosshair"
        >
          <Crosshair className="h-4 w-4" />
        </Button>

        {/* OHLC toggle */}
        <Button
          variant={ohlcEnabled ? 'default' : 'ghost'}
          size="sm"
          className={cn(
            "h-7 px-2 text-xs font-medium gap-1",
            ohlcEnabled 
              ? 'bg-primary/20 text-primary border border-primary/30' 
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onOhlcToggle(!ohlcEnabled)}
          title="Toggle OHLC tooltip"
        >
          <Info className="h-3.5 w-3.5" />
          OHLC
        </Button>
      </div>
    </div>
  );
}
