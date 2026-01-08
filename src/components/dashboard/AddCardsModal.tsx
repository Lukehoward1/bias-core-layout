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
import { Pin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DASHBOARD_CARD_REGISTRY, type DashboardSection } from '@/data/dashboardCardRegistry';
import { cn } from '@/lib/utils';

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
          <DialogTitle>Pin Cards to Dashboard</DialogTitle>
          <DialogDescription>
            Choose cards from Journal, Alerts, Calendar, Risk Tools, or Markets to pin to your Dashboard.
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
                        className={cn(
                          'transition-colors cursor-pointer',
                          isOnDashboard ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                        )}
                        onClick={() => {
                          if (isOnDashboard) {
                            onRemoveCard(card.id);
                          } else {
                            onAddCard(card.id);
                          }
                        }}
                      >
                        <CardContent className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground">{card.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className={cn(
                                  'h-8 w-8 rounded-full shrink-0 transition-colors',
                                  isOnDashboard && 'text-primary bg-primary/10 hover:bg-primary/20',
                                  !isOnDashboard && 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isOnDashboard) {
                                    onRemoveCard(card.id);
                                  } else {
                                    onAddCard(card.id);
                                  }
                                }}
                              >
                                <Pin className={cn('h-4 w-4', isOnDashboard && 'fill-current')} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              {isOnDashboard ? 'Unpin from Dashboard' : 'Pin to Dashboard'}
                            </TooltipContent>
                          </Tooltip>
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
