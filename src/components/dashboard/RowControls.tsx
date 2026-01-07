import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronUp, ChevronDown, Trash2, Columns2, LayoutGrid, Square, Plus } from 'lucide-react';
import type { RowType } from '@/hooks/use-dashboard-layout';

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
  kpi: 'KPI (4 small)',
  'wide-narrow': 'Wide + Narrow',
  equal: 'Two Equal',
  hero: 'Full Width',
};

const rowTypeIcons: Record<RowType, React.ReactNode> = {
  kpi: <LayoutGrid className="h-4 w-4" />,
  'wide-narrow': <Columns2 className="h-4 w-4" />,
  equal: <Columns2 className="h-4 w-4" />,
  hero: <Square className="h-4 w-4" />,
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
  if (isFixed) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
        <span>KPI Row (Fixed)</span>
      </div>
    );
  }

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

      {/* Row type dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            {rowTypeIcons[rowType]}
            <span className="hidden sm:inline">{rowTypeLabels[rowType]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {(['wide-narrow', 'equal', 'hero'] as RowType[]).map((type) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onChangeType(rowId, type)}
              className={rowType === type ? 'bg-muted' : ''}
            >
              {rowTypeIcons[type]}
              <span className="ml-2">{rowTypeLabels[type]}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onAddRow(rowId)} className="text-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Row Below
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRemoveRow(rowId)} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Row
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
