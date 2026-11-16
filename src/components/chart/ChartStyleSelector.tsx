import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { CandlestickChart, LineChart, BarChart3, AreaChart } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export type ChartStyle = 'candlestick' | 'bars' | 'line' | 'area' | 'heikin-ashi' | 'hollow';

interface ChartStyleSelectorProps {
  value: ChartStyle;
  onChange: (style: ChartStyle) => void;
}

const chartStyles: { value: ChartStyle; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { value: 'candlestick', label: 'Japanese Candlesticks', shortLabel: 'Candles',    icon: <CandlestickChart className="h-4 w-4" /> },
  { value: 'bars',        label: 'Bars',                  shortLabel: 'Bars',       icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'line',        label: 'Line',                  shortLabel: 'Line',       icon: <LineChart className="h-4 w-4" /> },
  { value: 'area',        label: 'Area',                  shortLabel: 'Area',       icon: <AreaChart className="h-4 w-4" /> },
  { value: 'heikin-ashi', label: 'Heikin Ashi',           shortLabel: 'Heikin',     icon: <CandlestickChart className="h-4 w-4" /> },
  { value: 'hollow',      label: 'Hollow Candles',        shortLabel: 'Hollow',     icon: <CandlestickChart className="h-4 w-4" /> },
];

export function ChartStyleSelector({ value, onChange }: ChartStyleSelectorProps) {
  const isMobile = useIsMobile();
  const currentStyle = chartStyles.find((s) => s.value === value);

  const [isBelowXl, setIsBelowXl] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1279px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)');
    const handler = (e: MediaQueryListEvent) => setIsBelowXl(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const triggerLabel = isBelowXl ? currentStyle?.shortLabel : currentStyle?.label;
  const triggerWidth = isMobile ? 'w-9' : isBelowXl ? 'w-[90px]' : 'w-[160px]';

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ChartStyle)}>
      <SelectTrigger className={`${triggerWidth} h-7 text-xs bg-transparent border-border/50 hover:bg-muted`}>
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {currentStyle?.icon}
          {!isMobile && (
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              {triggerLabel}
            </span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        {chartStyles.map((style) => (
          <SelectItem
            key={style.value}
            value={style.value}
            className="text-sm cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {style.icon}
              <span>{style.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
