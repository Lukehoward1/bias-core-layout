import { useState, useEffect, useCallback } from 'react';

export interface DashboardCardConfig {
  id: string;
  title: string;
  description: string;
  defaultVisible: boolean;
  category: 'metrics' | 'analysis' | 'overview';
}

// All available dashboard cards with metadata
export const AVAILABLE_CARDS: DashboardCardConfig[] = [
  { id: 'todays-bias', title: "Today's Bias", description: 'Current market bias direction', defaultVisible: true, category: 'metrics' },
  { id: 'active-trades', title: 'Active Trades', description: 'Current open positions', defaultVisible: true, category: 'metrics' },
  { id: 'next-session', title: 'Next Session', description: 'Upcoming trading session timer', defaultVisible: true, category: 'metrics' },
  { id: 'high-impact-events', title: 'High Impact Events', description: 'Important economic events today', defaultVisible: true, category: 'metrics' },
  { id: 'bias-snapshot', title: "Today's Bias Snapshot", description: 'Bias overview for watchlist assets', defaultVisible: true, category: 'analysis' },
  { id: 'session-timers', title: 'Session Timers', description: 'All trading session countdowns', defaultVisible: true, category: 'analysis' },
  { id: 'upcoming-events', title: 'Upcoming Events', description: 'Calendar of upcoming economic events', defaultVisible: true, category: 'overview' },
  { id: 'performance-overview', title: 'Performance Overview', description: 'Trading performance summary', defaultVisible: true, category: 'overview' },
  { id: 'journal-summary', title: 'Journal Summary', description: 'Recent journal entries overview', defaultVisible: false, category: 'overview' },
  { id: 'risk-snapshot', title: 'Risk Snapshot', description: 'Current risk exposure summary', defaultVisible: false, category: 'analysis' },
  { id: 'calendar-events', title: 'Calendar Events', description: 'Week ahead calendar preview', defaultVisible: false, category: 'overview' },
];

// External cards that can be added from other pages
const EXTERNAL_CARDS_KEY = 'streambias-external-cards';

const STORAGE_KEY = 'streambias-dashboard-layout';

interface DashboardLayout {
  visibleCards: string[];
  cardOrder: string[];
}

interface ExternalCard {
  id: string;
  title: string;
  description: string;
  category: 'metrics' | 'analysis' | 'overview';
}

const getDefaultLayout = (): DashboardLayout => ({
  visibleCards: AVAILABLE_CARDS.filter(c => c.defaultVisible).map(c => c.id),
  cardOrder: AVAILABLE_CARDS.filter(c => c.defaultVisible).map(c => c.id),
});

// Load external cards from storage
const loadExternalCards = (): ExternalCard[] => {
  try {
    const saved = localStorage.getItem(EXTERNAL_CARDS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load external cards:', e);
  }
  return [];
};

// Save external cards to storage
const saveExternalCards = (cards: ExternalCard[]) => {
  try {
    localStorage.setItem(EXTERNAL_CARDS_KEY, JSON.stringify(cards));
  } catch (e) {
    console.warn('Failed to save external cards:', e);
  }
};

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate saved layout has required fields
        if (parsed.visibleCards && parsed.cardOrder) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load dashboard layout:', e);
    }
    return getDefaultLayout();
  });

  const [externalCards, setExternalCards] = useState<ExternalCard[]>(loadExternalCards);
  const [isMoveMode, setIsMoveMode] = useState(false);

  // Persist layout changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {
      console.warn('Failed to save dashboard layout:', e);
    }
  }, [layout]);

  // Persist external cards
  useEffect(() => {
    saveExternalCards(externalCards);
  }, [externalCards]);

  const toggleMoveMode = useCallback(() => {
    setIsMoveMode(prev => !prev);
  }, []);

  // Legacy support - keep as alias
  const toggleEditMode = toggleMoveMode;
  const isEditMode = isMoveMode;

  const registerExternalCard = useCallback((cardId: string, title: string, description: string) => {
    setExternalCards(prev => {
      // Don't add if already exists
      if (prev.some(c => c.id === cardId) || AVAILABLE_CARDS.some(c => c.id === cardId)) {
        return prev;
      }
      return [...prev, { id: cardId, title, description, category: 'overview' }];
    });
  }, []);

  const addCard = useCallback((cardId: string) => {
    setLayout(prev => {
      if (prev.visibleCards.includes(cardId)) return prev;
      return {
        visibleCards: [...prev.visibleCards, cardId],
        cardOrder: [...prev.cardOrder, cardId],
      };
    });
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setLayout(prev => ({
      visibleCards: prev.visibleCards.filter(id => id !== cardId),
      cardOrder: prev.cardOrder.filter(id => id !== cardId),
    }));
  }, []);

  const reorderCards = useCallback((startIndex: number, endIndex: number) => {
    setLayout(prev => {
      const newOrder = [...prev.cardOrder];
      const [removed] = newOrder.splice(startIndex, 1);
      newOrder.splice(endIndex, 0, removed);
      return { ...prev, cardOrder: newOrder };
    });
  }, []);

  const moveCard = useCallback((draggedId: string, targetId: string) => {
    setLayout(prev => {
      const newOrder = [...prev.cardOrder];
      const draggedIndex = newOrder.indexOf(draggedId);
      const targetIndex = newOrder.indexOf(targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      
      return { ...prev, cardOrder: newOrder };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    const defaultLayout = getDefaultLayout();
    setLayout(defaultLayout);
    setExternalCards([]);
  }, []);

  const isCardVisible = useCallback((cardId: string) => {
    return layout.visibleCards.includes(cardId);
  }, [layout.visibleCards]);

  const getVisibleCardsInOrder = useCallback(() => {
    return layout.cardOrder.filter(id => layout.visibleCards.includes(id));
  }, [layout]);

  const getAvailableToAdd = useCallback(() => {
    const allCards = [...AVAILABLE_CARDS, ...externalCards.map(c => ({ ...c, defaultVisible: false }))];
    return allCards.filter(card => !layout.visibleCards.includes(card.id));
  }, [layout.visibleCards, externalCards]);

  const getAllCards = useCallback(() => {
    return [...AVAILABLE_CARDS, ...externalCards.map(c => ({ ...c, defaultVisible: false }))];
  }, [externalCards]);

  return {
    layout,
    isEditMode,
    isMoveMode,
    toggleEditMode,
    toggleMoveMode,
    addCard,
    removeCard,
    reorderCards,
    moveCard,
    resetToDefault,
    isCardVisible,
    getVisibleCardsInOrder,
    getAvailableToAdd,
    getAllCards,
    registerExternalCard,
    externalCards,
  };
}
