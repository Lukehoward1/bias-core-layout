import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pin, Check } from "lucide-react";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { isCardDashboardEligible, getCardById } from "@/data/dashboardCardRegistry";
import { toast } from "sonner";

interface AddToDashboardButtonProps {
  cardId: string;
  variant?: 'icon' | 'button';
  className?: string;
}

/**
 * Universal "Add to Dashboard" action button.
 * Only renders for cards that are registered as dashboard-eligible.
 * Shows "Added" state if already on dashboard.
 */
export function AddToDashboardButton({ 
  cardId, 
  variant = 'button',
  className = ''
}: AddToDashboardButtonProps) {
  const { addCard, removeCard, isCardOnDashboard } = useDashboardLayout();
  
  // Only render if card is in the registry (dashboard-eligible)
  if (!isCardDashboardEligible(cardId)) {
    return null;
  }
  
  const isAdded = isCardOnDashboard(cardId);
  const cardDef = getCardById(cardId);
  const cardTitle = cardDef?.title || 'Card';
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isAdded) {
      removeCard(cardId);
      toast.success(`Removed "${cardTitle}" from Dashboard`);
    } else {
      addCard(cardId, false, cardDef?.sourceSection);
      toast.success(`Added "${cardTitle}" to Dashboard`);
    }
  };
  
  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isAdded ? 'secondary' : 'ghost'}
            size="icon"
            onClick={handleClick}
            className={`h-7 w-7 ${className}`}
          >
            {isAdded ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isAdded ? 'Remove from Dashboard' : 'Add to Dashboard'}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <Button
      variant={isAdded ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleClick}
      className={`h-7 text-xs ${className}`}
    >
      {isAdded ? (
        <>
          <Check className="h-3 w-3 mr-1" />
          Added
        </>
      ) : (
        <>
          <Pin className="h-3 w-3 mr-1" />
          Add to Dashboard
        </>
      )}
    </Button>
  );
}
