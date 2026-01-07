import { Button } from '@/components/ui/button';
import { Settings2, RotateCcw, Check, Plus } from 'lucide-react';

interface DashboardEditToolbarProps {
  isEditMode: boolean;
  onToggleEdit: () => void;
  onReset: () => void;
  onOpenAddCards: () => void;
}

export function DashboardEditToolbar({
  isEditMode,
  onToggleEdit,
  onReset,
  onOpenAddCards,
}: DashboardEditToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {isEditMode && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAddCards}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Cards
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </>
      )}
      <Button
        variant={isEditMode ? "default" : "outline"}
        size="sm"
        onClick={onToggleEdit}
        className="gap-1.5"
      >
        {isEditMode ? (
          <>
            <Check className="h-4 w-4" />
            Done
          </>
        ) : (
          <>
            <Settings2 className="h-4 w-4" />
            Edit Dashboard
          </>
        )}
      </Button>
    </div>
  );
}
