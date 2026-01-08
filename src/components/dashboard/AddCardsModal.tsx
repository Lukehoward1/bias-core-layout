import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { DashboardCardConfig } from '@/hooks/use-dashboard-layout';

interface AddCardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCards: DashboardCardConfig[];
  onAddCard: (cardId: string) => void;
}

export function AddCardsModal({
  open,
  onOpenChange,
  availableCards,
  onAddCard,
}: AddCardsModalProps) {
  const groupedCards = availableCards.reduce((acc, card) => {
    if (!acc[card.category]) {
      acc[card.category] = [];
    }
    acc[card.category].push(card);
    return acc;
  }, {} as Record<string, DashboardCardConfig[]>);

  const categoryLabels: Record<string, string> = {
    metrics: 'Key Metrics',
    analysis: 'Analysis & Data',
    overview: 'Overview & Summaries',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Cards</DialogTitle>
          <DialogDescription>
            Choose cards to add to your Dashboard. Each card displays specific trading information.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto space-y-6 py-4">
          {availableCards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              All available cards are already on your Dashboard.
            </p>
          ) : (
            Object.entries(groupedCards).map(([category, cards]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  {categoryLabels[category] || category}
                </h4>
                <div className="space-y-2">
                  {cards.map((card) => (
                    <Card 
                      key={card.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-foreground">{card.title}</p>
                          <p className="text-xs text-muted-foreground">{card.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onAddCard(card.id);
                          }}
                          className="gap-1 shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
