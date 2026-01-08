import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddToDashboardButtonProps {
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * A dumb UI component for the "Pin to Dashboard" action.
 * Uses a pin icon only - no text labels.
 * 
 * IMPORTANT: This component contains NO hooks.
 * All state and logic must be passed down from parent containers.
 */
export function AddToDashboardButton({
  isAdded,
  onAdd,
  onRemove,
  size = 'sm',
  className,
}: AddToDashboardButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdded) {
      onRemove();
    } else {
      onAdd();
    }
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={cn(
            buttonSize,
            'rounded-full transition-colors',
            isAdded && 'text-primary bg-primary/10 hover:bg-primary/20',
            !isAdded && 'text-muted-foreground hover:text-foreground hover:bg-muted',
            className
          )}
        >
          {isAdded ? (
            <Pin className={cn(iconSize, 'fill-current')} />
          ) : (
            <Pin className={iconSize} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isAdded ? 'Unpin from Dashboard' : 'Pin to Dashboard'}
      </TooltipContent>
    </Tooltip>
  );
}
