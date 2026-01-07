import { Button } from '@/components/ui/button';
import { PinOff, Pin, Check } from 'lucide-react';
import { usePinnedDashboardCards, PinnedCard } from '@/hooks/use-pinned-dashboard-cards';
import { toast } from 'sonner';

interface AddToDashboardButtonProps {
  cardId: string;
  sourceType: PinnedCard['sourceType'];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

export function AddToDashboardButton({
  cardId,
  sourceType,
  variant = 'outline',
  size = 'sm',
  className,
}: AddToDashboardButtonProps) {
  const { isPinned, pinCard, unpinCard } = usePinnedDashboardCards();
  const pinned = isPinned(cardId);

  const handleClick = () => {
    if (pinned) {
      unpinCard(cardId);
      toast.success('Removed from Dashboard');
    } else {
      pinCard(cardId, sourceType);
      toast.success('Added to Dashboard');
    }
  };

  return (
    <Button
      variant={pinned ? 'secondary' : variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      {pinned ? (
        <>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Added
        </>
      ) : (
        <>
          <Pin className="h-3.5 w-3.5 mr-1.5" />
          Add to Dashboard
        </>
      )}
    </Button>
  );
}
