import { Button } from '@/components/ui/button';
import { LayoutDashboard, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';

interface AddToDashboardButtonProps {
  cardId: string;
  cardTitle: string;
  cardDescription?: string;
  className?: string;
}

export function AddToDashboardButton({
  cardId,
  cardTitle,
  cardDescription = '',
  className = '',
}: AddToDashboardButtonProps) {
  const { isCardVisible, addCard, registerExternalCard } = useDashboardLayout();
  
  const isOnDashboard = isCardVisible(cardId);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOnDashboard) {
      // Register the card if it's external (from other pages)
      registerExternalCard(cardId, cardTitle, cardDescription);
      addCard(cardId);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${isOnDashboard ? 'text-success cursor-default' : 'text-muted-foreground hover:text-foreground'} ${className}`}
            onClick={handleAdd}
            disabled={isOnDashboard}
          >
            {isOnDashboard ? (
              <Check className="h-4 w-4" />
            ) : (
              <LayoutDashboard className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">
            {isOnDashboard ? 'Already on Dashboard' : 'Add to Dashboard'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
