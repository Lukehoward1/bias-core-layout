import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddToDashboardButtonProps {
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
  size?: 'sm' | 'default';
  variant?: 'default' | 'minimal';
  className?: string;
}

/**
 * A dumb UI component for the "Add to Dashboard" action.
 * 
 * IMPORTANT: This component contains NO hooks.
 * All state and logic must be passed down from parent containers.
 */
export function AddToDashboardButton({
  isAdded,
  onAdd,
  onRemove,
  size = 'sm',
  variant = 'default',
  className,
}: AddToDashboardButtonProps) {
  const handleClick = () => {
    if (isAdded) {
      onRemove();
    } else {
      onAdd();
    }
  };

  if (variant === 'minimal') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isAdded ? 'secondary' : 'ghost'}
            size="icon"
            onClick={handleClick}
            className={cn('h-7 w-7', className)}
          >
            {isAdded ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isAdded ? 'Remove from Dashboard' : 'Add to Dashboard'}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={isAdded ? 'secondary' : 'outline'}
      size={size}
      onClick={handleClick}
      className={cn('gap-1.5', className)}
    >
      {isAdded ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Added
        </>
      ) : (
        <>
          <Plus className="h-3.5 w-3.5" />
          Add to Dashboard
        </>
      )}
    </Button>
  );
}
