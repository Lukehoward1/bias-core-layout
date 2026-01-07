import { useState, useEffect, useCallback } from 'react';

export interface DashboardCardConfig {
  id: string;
  title: string;
  description: string;
  defaultVisible: boolean;
  category: 'metrics' | 'analysis' | 'overview';
  isPinned?: boolean;
  sourceType?: 'journal-equity' | 'journal-summary' | 'alerts-timers' | 'calendar-events' | 'custom';
}

// All available dashboard cards with metadata (removed bias-snapshot, added watchlist-overview)
export const AVAILABLE_CARDS: DashboardCardConfig[] = [
  { id: 'todays-bias', title: "Today's Bias", description: 'Current market bias direction', defaultVisible: true, category: 'metrics' },
  { id: 'active-trades', title: 'Active Trades', description: 'Current open positions', defaultVisible: true, category: 'metrics' },
  { id: 'next-session', title: 'Next Session', description: 'Upcoming trading session timer', defaultVisible: true, category: 'metrics' },
  { id: 'high-impact-events', title: 'High Impact Events', description: 'Important economic events today', defaultVisible: true, category: 'metrics' },
  { id: 'watchlist-overview', title: 'Watchlist Overview', description: 'Your watchlist with key levels', defaultVisible: true, category: 'analysis' },
  { id: 'session-timers', title: 'Session Timers', description: 'All trading session countdowns', defaultVisible: true, category: 'analysis' },
  { id: 'upcoming-events', title: 'Upcoming Events', description: 'Calendar of upcoming economic events', defaultVisible: true, category: 'overview' },
  { id: 'performance-overview', title: 'Performance Overview', description: 'Trading performance summary', defaultVisible: true, category: 'overview' },
  { id: 'journal-summary', title: 'Journal Summary', description: 'Recent journal entries overview', defaultVisible: false, category: 'overview' },
  { id: 'risk-snapshot', title: 'Risk Snapshot', description: 'Current risk exposure summary', defaultVisible: false, category: 'analysis' },
  { id: 'calendar-events', title: 'Calendar Events', description: 'Week ahead calendar preview', defaultVisible: false, category: 'overview' },
];

const STORAGE_KEY = 'streambias-dashboard-layout-v2';

export interface DashboardCardEntry {
  id: string;
  isPinned: boolean;
  sourceType?: string;
}

interface DashboardLayout {
  cards: DashboardCardEntry[];
}

const getDefaultLayout = (): DashboardLayout => ({
  cards: AVAILABLE_CARDS.filter(c => c.defaultVisible).map(c => ({ 
    id: c.id, 
    isPinned: false 
  })),
});

// Migrate old layout format if needed
const migrateOldLayout = (): DashboardLayout | null => {
  try {
    // Check old storage key
    const oldSaved = localStorage.getItem('streambias-dashboard-layout');
    const oldPinned = localStorage.getItem('streambias-pinned-dashboard-cards');
    
    if (oldSaved) {
      const oldLayout = JSON.parse(oldSaved);
      const pinnedCards = oldPinned ? JSON.parse(oldPinned) : [];
      
      // Build new unified layout
      const cards: DashboardCardEntry[] = [];
      
      // Add visible default cards (excluding old bias-snapshot)
      if (oldLayout.cardOrder) {
        oldLayout.cardOrder.forEach((id: string) => {
          if (oldLayout.visibleCards?.includes(id) && id !== 'bias-snapshot') {
            cards.push({ id, isPinned: false });
          }
        });
      }
      
      // Add watchlist-overview if bias-snapshot was visible
      if (oldLayout.visibleCards?.includes('bias-snapshot')) {
        // Insert watchlist-overview in place of bias-snapshot
        const biasIndex = cards.findIndex(c => c.id === 'session-timers');
        if (biasIndex >= 0) {
          cards.splice(biasIndex, 0, { id: 'watchlist-overview', isPinned: false });
        } else {
          cards.push({ id: 'watchlist-overview', isPinned: false });
        }
      }
      
      // Add pinned cards at the end
      pinnedCards.forEach((pinned: { id: string; sourceType: string }) => {
        cards.push({ id: pinned.id, isPinned: true, sourceType: pinned.sourceType });
      });
      
      // Clean up old storage
      localStorage.removeItem('streambias-dashboard-layout');
      localStorage.removeItem('streambias-pinned-dashboard-cards');
      
      return { cards };
    }
  } catch (e) {
    console.warn('Failed to migrate old layout:', e);
  }
  return null;
};

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cards && Array.isArray(parsed.cards)) {
          return parsed;
        }
      }
      
      // Try migrating from old format
      const migrated = migrateOldLayout();
      if (migrated) {
        return migrated;
      }
    } catch (e) {
      console.warn('Failed to load dashboard layout:', e);
    }
    return getDefaultLayout();
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // Persist layout changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {
      console.warn('Failed to save dashboard layout:', e);
    }
  }, [layout]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);

  const addCard = useCallback((cardId: string, isPinned = false, sourceType?: string) => {
    setLayout(prev => {
      if (prev.cards.some(c => c.id === cardId)) return prev;
      return {
        cards: [...prev.cards, { id: cardId, isPinned, sourceType }],
      };
    });
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setLayout(prev => ({
      cards: prev.cards.filter(c => c.id !== cardId),
    }));
  }, []);

  const moveCard = useCallback((draggedId: string, targetId: string) => {
    setLayout(prev => {
      const newCards = [...prev.cards];
      const draggedIndex = newCards.findIndex(c => c.id === draggedId);
      const targetIndex = newCards.findIndex(c => c.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      const [removed] = newCards.splice(draggedIndex, 1);
      newCards.splice(targetIndex, 0, removed);
      
      return { cards: newCards };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setLayout(getDefaultLayout());
  }, []);

  const isCardVisible = useCallback((cardId: string) => {
    return layout.cards.some(c => c.id === cardId);
  }, [layout.cards]);

  const getVisibleCardsInOrder = useCallback((): DashboardCardEntry[] => {
    return layout.cards;
  }, [layout]);

  const getAvailableToAdd = useCallback(() => {
    const currentIds = layout.cards.map(c => c.id);
    return AVAILABLE_CARDS.filter(card => !currentIds.includes(card.id));
  }, [layout.cards]);

  // For pinned cards from external sources
  const pinCard = useCallback((cardId: string, sourceType: string) => {
    setLayout(prev => {
      if (prev.cards.some(c => c.id === cardId)) return prev;
      return {
        cards: [...prev.cards, { id: cardId, isPinned: true, sourceType }],
      };
    });
  }, []);

  const unpinCard = useCallback((cardId: string) => {
    setLayout(prev => ({
      cards: prev.cards.filter(c => c.id !== cardId),
    }));
  }, []);

  const isPinned = useCallback((cardId: string) => {
    return layout.cards.some(c => c.id === cardId && c.isPinned);
  }, [layout.cards]);

  return {
    layout,
    isEditMode,
    toggleEditMode,
    addCard,
    removeCard,
    moveCard,
    resetToDefault,
    isCardVisible,
    getVisibleCardsInOrder,
    getAvailableToAdd,
    // Pinning API (unified)
    pinCard,
    unpinCard,
    isPinned,
  };
}
