import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CandlestickChart, LineChart, BarChart3, AreaChart } from 'lucide-react';

export type ChartStyle = 'candlestick' | 'bars' | 'line' | 'area' | 'heikin-ashi' | 'hollow';

interface ChartStyleSelectorProps {
  value: ChartStyle;
  onChange: (style: ChartStyle) => void;
}

const chartStyles: { value: ChartStyle; label: string; icon: React.ReactNode }[] = [
  { value: 'candlestick', label: 'Japanese Candlesticks', icon: <CandlestickChart className="h-4 w-4" /> },
  { value: 'bars', label: 'Bars', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'line', label: 'Line', icon: <LineChart className="h-4 w-4" /> },
  { value: 'area', label: 'Area', icon: <AreaChart className="h-4 w-4" /> },
  { value: 'heikin-ashi', label: 'Heikin Ashi', icon: <CandlestickChart className="h-4 w-4" /> },
  { value: 'hollow', label: 'Hollow Candles', icon: <CandlestickChart className="h-4 w-4" /> },
];

export function ChartStyleSelector({ value, onChange }: ChartStyleSelectorProps) {
  const currentStyle = chartStyles.find((s) => s.value === value);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as ChartStyle)}>
      <SelectTrigger className="w-[140px] h-7 text-xs bg-transparent border-border/50 hover:bg-muted">
        <div className="flex items-center gap-1.5">
          {currentStyle?.icon}
          <SelectValue />
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
