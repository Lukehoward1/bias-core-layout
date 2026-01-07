import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronUp, ChevronDown, Trash2, Plus, LayoutGrid } from 'lucide-react';
import type { RowType } from '@/hooks/use-dashboard-layout';
import { LayoutSelectorGrid } from './LayoutThumbnail';
import { useState } from 'react';

interface RowControlsProps {
  rowId: string;
  rowType: RowType;
  isFixed?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChangeType: (rowId: string, type: RowType) => void;
  onMoveRow: (rowId: string, direction: 'up' | 'down') => void;
  onRemoveRow: (rowId: string) => void;
  onAddRow: (afterRowId: string) => void;
}

const rowTypeLabels: Record<RowType, string> = {
  kpi: 'KPI Row',
  'wide-narrow': 'Wide + Narrow',
  equal: '2 Equal',
  hero: 'Full Width',
  'three-equal': '3 Equal',
  'four-equal': '4 Equal',
};

export function RowControls({
  rowId,
  rowType,
  isFixed,
  canMoveUp,
  canMoveDown,
  onChangeType,
  onMoveRow,
  onRemoveRow,
  onAddRow,
}: RowControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isFixed) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
        <span>KPI Row (Fixed)</span>
      </div>
    );
  }

  const handleSelectType = (type: RowType) => {
    onChangeType(rowId, type);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Move buttons */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onMoveRow(rowId, 'up')}
        disabled={!canMoveUp}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onMoveRow(rowId, 'down')}
        disabled={!canMoveDown}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      {/* Visual Layout Selector */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">{rowTypeLabels[rowType]}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0 bg-popover border border-border shadow-lg">
          <div className="p-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Row Layout</span>
          </div>
          <LayoutSelectorGrid
            currentType={rowType}
            onSelectType={handleSelectType}
          />
          <div className="border-t border-border p-2 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1 text-primary hover:text-primary"
              onClick={() => {
                onAddRow(rowId);
                setIsOpen(false);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Row
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1 text-destructive hover:text-destructive"
              onClick={() => {
                onRemoveRow(rowId);
                setIsOpen(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
