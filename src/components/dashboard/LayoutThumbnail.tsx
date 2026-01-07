import { cn } from '@/lib/utils';
import type { RowType } from '@/hooks/use-dashboard-layout';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LayoutThumbnailProps {
  type: RowType;
  isSelected?: boolean;
  onClick?: () => void;
  showLabel?: boolean;
}

const layoutConfigs: Record<RowType, { label: string; tooltip: string; blocks: number[] }> = {
  hero: {
    label: 'Full Width',
    tooltip: 'Single full-width card',
    blocks: [1], // One full block
  },
  'wide-narrow': {
    label: 'Wide + Narrow',
    tooltip: 'Wide card on left, narrow on right',
    blocks: [2, 1], // 2 parts wide, 1 part narrow
  },
  equal: {
    label: '2 Equal',
    tooltip: 'Two equal-width cards',
    blocks: [1, 1], // Two equal blocks
  },
  'three-equal': {
    label: '3 Equal',
    tooltip: 'Three equal-width cards',
    blocks: [1, 1, 1], // Three equal blocks
  },
  'four-equal': {
    label: '4 Equal',
    tooltip: 'Four equal-width cards',
    blocks: [1, 1, 1, 1], // Four equal blocks
  },
  kpi: {
    label: 'KPI Row',
    tooltip: '4 small metric cards (fixed)',
    blocks: [1, 1, 1, 1], // Four equal blocks for KPI
  },
};

function LayoutBlocks({ type }: { type: RowType }) {
  const config = layoutConfigs[type];
  const totalParts = config.blocks.reduce((sum, b) => sum + b, 0);

  return (
    <div className="flex gap-0.5 w-full h-full p-1">
      {config.blocks.map((weight, index) => (
        <div
          key={index}
          className="bg-muted-foreground/30 rounded-sm"
          style={{ flex: weight }}
        />
      ))}
    </div>
  );
}

export function LayoutThumbnail({ type, isSelected, onClick, showLabel = true }: LayoutThumbnailProps) {
  const config = layoutConfigs[type];

  const thumbnail = (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all',
        'hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected && 'bg-primary/10 ring-2 ring-primary'
      )}
    >
      <div
        className={cn(
          'w-16 h-8 rounded border-2 transition-colors',
          isSelected ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 bg-muted/50'
        )}
      >
        <LayoutBlocks type={type} />
      </div>
      {showLabel && (
        <span className={cn(
          'text-[10px] font-medium',
          isSelected ? 'text-primary' : 'text-muted-foreground'
        )}>
          {config.label}
        </span>
      )}
    </button>
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {thumbnail}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface LayoutSelectorGridProps {
  currentType: RowType;
  onSelectType: (type: RowType) => void;
  excludeTypes?: RowType[];
}

export function LayoutSelectorGrid({ currentType, onSelectType, excludeTypes = ['kpi'] }: LayoutSelectorGridProps) {
  const allTypes: RowType[] = ['hero', 'wide-narrow', 'equal', 'three-equal', 'four-equal'];
  const availableTypes = allTypes.filter((type) => !excludeTypes.includes(type));

  return (
    <div className="grid grid-cols-3 gap-1 p-2">
      {availableTypes.map((type) => (
        <LayoutThumbnail
          key={type}
          type={type}
          isSelected={currentType === type}
          onClick={() => onSelectType(type)}
        />
      ))}
    </div>
  );
}
