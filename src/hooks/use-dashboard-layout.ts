import { useState, useEffect, useCallback } from 'react';

export type CardSize = 'compact' | 'standard' | 'wide' | 'hero';

export interface DashboardCardConfig {
  id: string;
  title: string;
  description: string;
  defaultVisible: boolean;
  category: 'metrics' | 'analysis' | 'overview';
  isPinned?: boolean;
  sourceType?: 'journal-equity' | 'journal-summary' | 'alerts-timers' | 'calendar-events' | 'custom';
  allowedSizes: CardSize[];
  defaultSize: CardSize;
}

// All available dashboard cards with metadata
export const AVAILABLE_CARDS: DashboardCardConfig[] = [
  { id: 'todays-bias', title: "Today's Bias", description: 'Current market bias direction', defaultVisible: true, category: 'metrics', allowedSizes: ['compact', 'standard'], defaultSize: 'compact' },
  { id: 'active-trades', title: 'Active Trades', description: 'Current open positions', defaultVisible: true, category: 'metrics', allowedSizes: ['compact', 'standard'], defaultSize: 'compact' },
  { id: 'next-session', title: 'Next Session', description: 'Upcoming trading session timer', defaultVisible: true, category: 'metrics', allowedSizes: ['compact', 'standard'], defaultSize: 'compact' },
  { id: 'high-impact-events', title: 'High Impact Events', description: 'Important economic events today', defaultVisible: true, category: 'metrics', allowedSizes: ['compact', 'standard'], defaultSize: 'compact' },
  { id: 'watchlist-overview', title: 'Watchlist Overview', description: 'Your watchlist with key levels', defaultVisible: true, category: 'analysis', allowedSizes: ['compact', 'standard', 'wide'], defaultSize: 'standard' },
  { id: 'session-timers', title: 'Session Timers', description: 'All trading session countdowns', defaultVisible: true, category: 'analysis', allowedSizes: ['compact', 'standard', 'wide'], defaultSize: 'standard' },
  { id: 'upcoming-events', title: 'Upcoming Events', description: 'Calendar of upcoming economic events', defaultVisible: true, category: 'overview', allowedSizes: ['standard', 'wide'], defaultSize: 'standard' },
  { id: 'performance-overview', title: 'Performance Overview', description: 'Trading performance summary', defaultVisible: true, category: 'overview', allowedSizes: ['compact', 'standard', 'wide', 'hero'], defaultSize: 'standard' },
  { id: 'journal-summary', title: 'Journal Summary', description: 'Recent journal entries overview', defaultVisible: false, category: 'overview', allowedSizes: ['compact', 'standard'], defaultSize: 'standard' },
  { id: 'risk-snapshot', title: 'Risk Snapshot', description: 'Current risk exposure summary', defaultVisible: false, category: 'analysis', allowedSizes: ['compact', 'standard'], defaultSize: 'standard' },
  { id: 'calendar-events', title: 'Calendar Events', description: 'Week ahead calendar preview', defaultVisible: false, category: 'overview', allowedSizes: ['standard', 'wide'], defaultSize: 'standard' },
];

// Pinned card configs (from external sources like Journal)
export const PINNED_CARD_CONFIGS: Record<string, Omit<DashboardCardConfig, 'id' | 'defaultVisible' | 'category'>> = {
  'journal-equity': {
    title: 'Journal Equity Curve',
    description: 'Your trading performance equity curve',
    allowedSizes: ['standard', 'wide', 'hero'],
    defaultSize: 'standard',
  },
};

const STORAGE_KEY = 'streambias-dashboard-layout-v3';

export interface DashboardCardEntry {
  id: string;
  isPinned: boolean;
  sourceType?: string;
  size: CardSize;
}

interface DashboardLayout {
  cards: DashboardCardEntry[];
  heroCardId: string | null; // Card currently in the hero row
}

const getDefaultLayout = (): DashboardLayout => ({
  cards: AVAILABLE_CARDS.filter(c => c.defaultVisible).map(c => ({ 
    id: c.id, 
    isPinned: false,
    size: c.defaultSize,
  })),
  heroCardId: null,
});

// Get allowed sizes for a card (including pinned cards)
export const getCardAllowedSizes = (cardId: string, sourceType?: string): CardSize[] => {
  if (sourceType && PINNED_CARD_CONFIGS[sourceType]) {
    return PINNED_CARD_CONFIGS[sourceType].allowedSizes;
  }
  const config = AVAILABLE_CARDS.find(c => c.id === cardId);
  return config?.allowedSizes || ['standard'];
};

// Get card title
export const getCardTitle = (cardId: string, sourceType?: string): string => {
  if (sourceType && PINNED_CARD_CONFIGS[sourceType]) {
    return PINNED_CARD_CONFIGS[sourceType].title;
  }
  const config = AVAILABLE_CARDS.find(c => c.id === cardId);
  return config?.title || cardId;
};

// Migrate old layout format if needed
const migrateOldLayout = (): DashboardLayout | null => {
  try {
    // Check v2 storage key
    const v2Saved = localStorage.getItem('streambias-dashboard-layout-v2');
    if (v2Saved) {
      const v2Layout = JSON.parse(v2Saved);
      if (v2Layout.cards && Array.isArray(v2Layout.cards)) {
        // Migrate v2 to v3 - add size field
        const cards: DashboardCardEntry[] = v2Layout.cards.map((c: any) => {
          const allowedSizes = getCardAllowedSizes(c.id, c.sourceType);
          const defaultConfig = AVAILABLE_CARDS.find(cfg => cfg.id === c.id);
          return {
            ...c,
            size: c.size || defaultConfig?.defaultSize || allowedSizes[0] || 'standard',
          };
        });
        localStorage.removeItem('streambias-dashboard-layout-v2');
        return { cards, heroCardId: null };
      }
    }

    // Check old storage key
    const oldSaved = localStorage.getItem('streambias-dashboard-layout');
    const oldPinned = localStorage.getItem('streambias-pinned-dashboard-cards');
    
    if (oldSaved) {
      const oldLayout = JSON.parse(oldSaved);
      const pinnedCards = oldPinned ? JSON.parse(oldPinned) : [];
      
      const cards: DashboardCardEntry[] = [];
      
      if (oldLayout.cardOrder) {
        oldLayout.cardOrder.forEach((id: string) => {
          if (oldLayout.visibleCards?.includes(id) && id !== 'bias-snapshot') {
            const config = AVAILABLE_CARDS.find(c => c.id === id);
            cards.push({ id, isPinned: false, size: config?.defaultSize || 'standard' });
          }
        });
      }
      
      if (oldLayout.visibleCards?.includes('bias-snapshot')) {
        const biasIndex = cards.findIndex(c => c.id === 'session-timers');
        if (biasIndex >= 0) {
          cards.splice(biasIndex, 0, { id: 'watchlist-overview', isPinned: false, size: 'standard' });
        } else {
          cards.push({ id: 'watchlist-overview', isPinned: false, size: 'standard' });
        }
      }
      
      pinnedCards.forEach((pinned: { id: string; sourceType: string }) => {
        const pinnedConfig = PINNED_CARD_CONFIGS[pinned.sourceType];
        cards.push({ 
          id: pinned.id, 
          isPinned: true, 
          sourceType: pinned.sourceType,
          size: pinnedConfig?.defaultSize || 'standard',
        });
      });
      
      localStorage.removeItem('streambias-dashboard-layout');
      localStorage.removeItem('streambias-pinned-dashboard-cards');
      
      return { cards, heroCardId: null };
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
      const config = AVAILABLE_CARDS.find(c => c.id === cardId);
      const pinnedConfig = sourceType ? PINNED_CARD_CONFIGS[sourceType] : null;
      const defaultSize = pinnedConfig?.defaultSize || config?.defaultSize || 'standard';
      return {
        ...prev,
        cards: [...prev.cards, { id: cardId, isPinned, sourceType, size: defaultSize }],
      };
    });
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setLayout(prev => ({
      cards: prev.cards.filter(c => c.id !== cardId),
      heroCardId: prev.heroCardId === cardId ? null : prev.heroCardId,
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
      
      return { ...prev, cards: newCards };
    });
  }, []);

  const setCardSize = useCallback((cardId: string, size: CardSize) => {
    setLayout(prev => {
      const card = prev.cards.find(c => c.id === cardId);
      if (!card) return prev;
      
      const allowedSizes = getCardAllowedSizes(cardId, card.sourceType);
      if (!allowedSizes.includes(size)) return prev;

      // If setting to hero, check if it's allowed and update heroCardId
      let newHeroCardId = prev.heroCardId;
      if (size === 'hero') {
        newHeroCardId = cardId;
      } else if (prev.heroCardId === cardId) {
        newHeroCardId = null;
      }

      return {
        ...prev,
        cards: prev.cards.map(c => 
          c.id === cardId ? { ...c, size } : c
        ),
        heroCardId: newHeroCardId,
      };
    });
  }, []);

  const setHeroCard = useCallback((cardId: string | null) => {
    setLayout(prev => {
      if (cardId === null) {
        // Remove hero status from current hero card
        return {
          ...prev,
          cards: prev.cards.map(c => 
            c.id === prev.heroCardId ? { ...c, size: 'wide' } : c
          ),
          heroCardId: null,
        };
      }

      const card = prev.cards.find(c => c.id === cardId);
      if (!card) return prev;

      const allowedSizes = getCardAllowedSizes(cardId, card.sourceType);
      if (!allowedSizes.includes('hero') && !allowedSizes.includes('wide')) return prev;

      // Set new hero, demote old hero to wide
      return {
        ...prev,
        cards: prev.cards.map(c => {
          if (c.id === cardId) return { ...c, size: 'hero' };
          if (c.id === prev.heroCardId) return { ...c, size: 'wide' };
          return c;
        }),
        heroCardId: cardId,
      };
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

  const getHeroCard = useCallback((): DashboardCardEntry | null => {
    if (!layout.heroCardId) return null;
    return layout.cards.find(c => c.id === layout.heroCardId) || null;
  }, [layout]);

  const getAvailableToAdd = useCallback(() => {
    const currentIds = layout.cards.map(c => c.id);
    return AVAILABLE_CARDS.filter(card => !currentIds.includes(card.id));
  }, [layout.cards]);

  // For pinned cards from external sources
  const pinCard = useCallback((cardId: string, sourceType: string) => {
    setLayout(prev => {
      if (prev.cards.some(c => c.id === cardId)) return prev;
      const pinnedConfig = PINNED_CARD_CONFIGS[sourceType];
      return {
        ...prev,
        cards: [...prev.cards, { 
          id: cardId, 
          isPinned: true, 
          sourceType,
          size: pinnedConfig?.defaultSize || 'standard',
        }],
      };
    });
  }, []);

  const unpinCard = useCallback((cardId: string) => {
    setLayout(prev => ({
      cards: prev.cards.filter(c => c.id !== cardId),
      heroCardId: prev.heroCardId === cardId ? null : prev.heroCardId,
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
    setCardSize,
    setHeroCard,
    getHeroCard,
    resetToDefault,
    isCardVisible,
    getVisibleCardsInOrder,
    getAvailableToAdd,
    // Pinning API
    pinCard,
    unpinCard,
    isPinned,
  };
}
