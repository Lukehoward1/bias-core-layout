import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Check } from 'lucide-react';
import { DASHBOARD_CARD_REGISTRY, type DashboardSection } from '@/data/dashboardCardRegistry';

interface AddCardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set of card IDs currently on the dashboard */
  cardsOnDashboard: Set<string>;
  onAddCard: (cardId: string) => void;
  onRemoveCard: (cardId: string) => void;
}

const sectionLabels: Record<DashboardSection, string> = {
  journal: 'Journal',
  reports: 'Reports & Performance',
  alerts: 'Alerts',
  calendar: 'Calendar',
  'risk-tools': 'Risk Tools',
  markets: 'Markets & Watchlist',
};

const sectionOrder: DashboardSection[] = ['markets', 'journal', 'reports', 'alerts', 'calendar', 'risk-tools'];

export function AddCardsModal({
  open,
  onOpenChange,
  cardsOnDashboard,
  onAddCard,
  onRemoveCard,
}: AddCardsModalProps) {
  // Group cards by section
  const groupedCards = DASHBOARD_CARD_REGISTRY.reduce((acc, card) => {
    if (!acc[card.section]) {
      acc[card.section] = [];
    }
    acc[card.section].push(card);
    return acc;
  }, {} as Record<DashboardSection, typeof DASHBOARD_CARD_REGISTRY>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Cards to Dashboard</DialogTitle>
          <DialogDescription>
            Choose cards from Journal, Alerts, Calendar, Risk Tools, or Markets to add to your Dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto space-y-6 py-4 pr-1">
          {sectionOrder.map((section) => {
            const cards = groupedCards[section];
            if (!cards || cards.length === 0) return null;

            return (
              <div key={section}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  {sectionLabels[section]}
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {cards.filter(c => cardsOnDashboard.has(c.id)).length}/{cards.length}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {cards.map((card) => {
                    const isOnDashboard = cardsOnDashboard.has(card.id);
                    
                    return (
                      <Card 
                        key={card.id}
                        className={`transition-colors ${isOnDashboard ? 'bg-muted/30 border-primary/20' : 'hover:bg-muted/50'}`}
                      >
                        <CardContent className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground">{card.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={isOnDashboard ? 'secondary' : 'outline'}
                            onClick={() => {
                              if (isOnDashboard) {
                                onRemoveCard(card.id);
                              } else {
                                onAddCard(card.id);
                              }
                            }}
                            className="gap-1.5 shrink-0"
                          >
                            {isOnDashboard ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                Add
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
