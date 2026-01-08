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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DASHBOARD_CARD_REGISTRY,
  SECTION_CONFIG,
  type DashboardSection,
  type DashboardCardDefinition,
} from '@/data/dashboardCardRegistry';

interface AddCardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCardIds: string[];
  onAddCard: (cardId: string) => void;
}

export function AddCardsModal({
  open,
  onOpenChange,
  currentCardIds,
  onAddCard,
}: AddCardsModalProps) {
  // Filter out cards already in the dashboard
  const availableCards = DASHBOARD_CARD_REGISTRY.filter(
    card => !currentCardIds.includes(card.cardId)
  );

  // Group available cards by section
  const groupedCards = availableCards.reduce((acc, card) => {
    if (!acc[card.sourceSection]) {
      acc[card.sourceSection] = [];
    }
    acc[card.sourceSection].push(card);
    return acc;
  }, {} as Record<DashboardSection, DashboardCardDefinition[]>);

  // Get sections in order, only those with available cards
  const orderedSections = (Object.keys(SECTION_CONFIG) as DashboardSection[])
    .filter(section => groupedCards[section]?.length > 0)
    .sort((a, b) => SECTION_CONFIG[a].order - SECTION_CONFIG[b].order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Cards</DialogTitle>
          <DialogDescription>
            Choose cards to add to your Dashboard from approved sections.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {orderedSections.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                All available cards are already on your Dashboard.
              </p>
            ) : (
              orderedSections.map(section => (
                <div key={section}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    {SECTION_CONFIG[section].label}
                  </h4>
                  <div className="space-y-2">
                    {groupedCards[section].map((card) => (
                      <Card 
                        key={card.cardId}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="min-w-0 flex-1 mr-3">
                            <p className="font-medium text-sm text-foreground truncate">
                              {card.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {card.description}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddCard(card.cardId)}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}