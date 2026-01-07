import { useState, useEffect, useCallback } from 'react';

export interface PinnedCard {
  id: string;
  sourceType: 'journal-equity' | 'journal-summary' | 'alerts-timers' | 'calendar-events' | 'custom';
  addedAt: number;
}

const STORAGE_KEY = 'streambias-pinned-dashboard-cards';

export function usePinnedDashboardCards() {
  const [pinnedCards, setPinnedCards] = useState<PinnedCard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load pinned cards:', e);
    }
    return [];
  });

  // Persist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedCards));
    } catch (e) {
      console.warn('Failed to save pinned cards:', e);
    }
  }, [pinnedCards]);

  const isPinned = useCallback((cardId: string) => {
    return pinnedCards.some(card => card.id === cardId);
  }, [pinnedCards]);

  const pinCard = useCallback((cardId: string, sourceType: PinnedCard['sourceType']) => {
    setPinnedCards(prev => {
      // Prevent duplicates
      if (prev.some(card => card.id === cardId)) {
        return prev;
      }
      return [...prev, { id: cardId, sourceType, addedAt: Date.now() }];
    });
  }, []);

  const unpinCard = useCallback((cardId: string) => {
    setPinnedCards(prev => prev.filter(card => card.id !== cardId));
  }, []);

  const getPinnedCards = useCallback(() => {
    return [...pinnedCards].sort((a, b) => a.addedAt - b.addedAt);
  }, [pinnedCards]);

  const clearAllPinned = useCallback(() => {
    setPinnedCards([]);
  }, []);

  return {
    pinnedCards,
    isPinned,
    pinCard,
    unpinCard,
    getPinnedCards,
    clearAllPinned,
  };
}
