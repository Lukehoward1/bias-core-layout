import { useState, useEffect, useCallback } from 'react';

export type RowType = 'kpi' | 'wide-narrow' | 'equal' | 'hero';

export interface DashboardCardConfig {
  id: string;
  title: string;
  description: string;
  defaultVisible: boolean;
  category: 'metrics' | 'analysis' | 'overview';
  isPinned?: boolean;
  sourceType?: 'journal-equity' | 'journal-summary' | 'alerts-timers' | 'calendar-events' | 'custom';
  allowedRowTypes?: RowType[];
}

// All available dashboard cards with metadata
export const AVAILABLE_CARDS: DashboardCardConfig[] = [
  { id: 'todays-bias', title: "Today's Bias", description: 'Current market bias direction', defaultVisible: true, category: 'metrics', allowedRowTypes: ['kpi'] },
  { id: 'active-trades', title: 'Active Trades', description: 'Current open positions', defaultVisible: true, category: 'metrics', allowedRowTypes: ['kpi'] },
  { id: 'next-session', title: 'Next Session', description: 'Upcoming trading session timer', defaultVisible: true, category: 'metrics', allowedRowTypes: ['kpi'] },
  { id: 'high-impact-events', title: 'High Impact Events', description: 'Important economic events today', defaultVisible: true, category: 'metrics', allowedRowTypes: ['kpi'] },
  { id: 'watchlist-overview', title: 'Watchlist Overview', description: 'Your watchlist with key levels', defaultVisible: true, category: 'analysis', allowedRowTypes: ['wide-narrow', 'equal', 'hero'] },
  { id: 'session-timers', title: 'Session Timers', description: 'All trading session countdowns', defaultVisible: true, category: 'analysis', allowedRowTypes: ['wide-narrow', 'equal', 'hero'] },
  { id: 'upcoming-events', title: 'Upcoming Events', description: 'Calendar of upcoming economic events', defaultVisible: true, category: 'overview', allowedRowTypes: ['equal', 'hero'] },
  { id: 'performance-overview', title: 'Performance Overview', description: 'Trading performance summary', defaultVisible: true, category: 'overview', allowedRowTypes: ['equal', 'hero'] },
  { id: 'journal-summary', title: 'Journal Summary', description: 'Recent journal entries overview', defaultVisible: false, category: 'overview', allowedRowTypes: ['equal', 'hero'] },
  { id: 'risk-snapshot', title: 'Risk Snapshot', description: 'Current risk exposure summary', defaultVisible: false, category: 'analysis', allowedRowTypes: ['wide-narrow', 'equal'] },
  { id: 'calendar-events', title: 'Calendar Events', description: 'Week ahead calendar preview', defaultVisible: false, category: 'overview', allowedRowTypes: ['equal', 'hero'] },
];

const STORAGE_KEY = 'streambias-dashboard-layout-v3';

export interface DashboardCardEntry {
  id: string;
  isPinned: boolean;
  sourceType?: string;
}

export interface DashboardRow {
  id: string;
  type: RowType;
  cards: DashboardCardEntry[];
  isFixed?: boolean; // KPI row is fixed
}

interface DashboardLayout {
  rows: DashboardRow[];
}

const generateRowId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getDefaultLayout = (): DashboardLayout => ({
  rows: [
    {
      id: 'kpi-row',
      type: 'kpi',
      isFixed: true,
      cards: [
        { id: 'todays-bias', isPinned: false },
        { id: 'active-trades', isPinned: false },
        { id: 'next-session', isPinned: false },
        { id: 'high-impact-events', isPinned: false },
      ],
    },
    {
      id: 'analysis-row',
      type: 'wide-narrow',
      cards: [
        { id: 'watchlist-overview', isPinned: false },
        { id: 'session-timers', isPinned: false },
      ],
    },
    {
      id: 'overview-row',
      type: 'equal',
      cards: [
        { id: 'upcoming-events', isPinned: false },
        { id: 'performance-overview', isPinned: false },
      ],
    },
  ],
});

// Migrate from old v2 format
const migrateOldLayout = (): DashboardLayout | null => {
  try {
    const oldSaved = localStorage.getItem('streambias-dashboard-layout-v2');
    if (oldSaved) {
      const oldLayout = JSON.parse(oldSaved);
      if (oldLayout.cards && Array.isArray(oldLayout.cards)) {
        // Build new row-based layout from flat card list
        const defaultLayout = getDefaultLayout();
        
        // Map old cards to rows based on categories
        const kpiCards = ['todays-bias', 'active-trades', 'next-session', 'high-impact-events'];
        const analysisCards = ['watchlist-overview', 'session-timers', 'risk-snapshot'];
        const overviewCards = ['upcoming-events', 'performance-overview', 'journal-summary', 'calendar-events'];
        
        const oldCards: DashboardCardEntry[] = oldLayout.cards;
        
        // KPI row
        defaultLayout.rows[0].cards = oldCards.filter(c => kpiCards.includes(c.id));
        
        // Analysis row (wide-narrow)
        const analysisEntries = oldCards.filter(c => analysisCards.includes(c.id));
        if (analysisEntries.length > 0) {
          defaultLayout.rows[1].cards = analysisEntries.slice(0, 2);
        }
        
        // Overview row (equal)
        const overviewEntries = oldCards.filter(c => overviewCards.includes(c.id));
        if (overviewEntries.length > 0) {
          defaultLayout.rows[2].cards = overviewEntries.slice(0, 2);
        }
        
        // Add remaining cards as new equal rows
        const assignedIds = [
          ...defaultLayout.rows[0].cards.map(c => c.id),
          ...defaultLayout.rows[1].cards.map(c => c.id),
          ...defaultLayout.rows[2].cards.map(c => c.id),
        ];
        
        const remainingCards = oldCards.filter(c => !assignedIds.includes(c.id));
        for (let i = 0; i < remainingCards.length; i += 2) {
          const rowCards = remainingCards.slice(i, i + 2);
          if (rowCards.length > 0) {
            defaultLayout.rows.push({
              id: generateRowId(),
              type: rowCards[0].isPinned ? 'hero' : 'equal',
              cards: rowCards,
            });
          }
        }
        
        // Clean up old storage
        localStorage.removeItem('streambias-dashboard-layout-v2');
        
        return defaultLayout;
      }
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
        if (parsed.rows && Array.isArray(parsed.rows)) {
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

  // Get max slots for a row type
  const getMaxSlots = (rowType: RowType): number => {
    switch (rowType) {
      case 'kpi': return 4;
      case 'wide-narrow': return 2;
      case 'equal': return 2;
      case 'hero': return 1;
      default: return 2;
    }
  };

  // Add a card to a specific row
  const addCardToRow = useCallback((rowId: string, cardId: string, isPinned = false, sourceType?: string) => {
    setLayout(prev => {
      const newRows = prev.rows.map(row => {
        if (row.id === rowId) {
          const maxSlots = getMaxSlots(row.type);
          if (row.cards.length >= maxSlots) return row;
          if (row.cards.some(c => c.id === cardId)) return row;
          return {
            ...row,
            cards: [...row.cards, { id: cardId, isPinned, sourceType }],
          };
        }
        return row;
      });
      return { rows: newRows };
    });
  }, []);

  // Add a new row
  const addRow = useCallback((type: RowType = 'equal', afterRowId?: string) => {
    setLayout(prev => {
      const newRow: DashboardRow = {
        id: generateRowId(),
        type,
        cards: [],
      };
      
      if (afterRowId) {
        const index = prev.rows.findIndex(r => r.id === afterRowId);
        if (index !== -1) {
          const newRows = [...prev.rows];
          newRows.splice(index + 1, 0, newRow);
          return { rows: newRows };
        }
      }
      
      return { rows: [...prev.rows, newRow] };
    });
  }, []);

  // Change row type
  const changeRowType = useCallback((rowId: string, newType: RowType) => {
    setLayout(prev => {
      const newRows = prev.rows.map(row => {
        if (row.id === rowId && !row.isFixed) {
          const maxSlots = getMaxSlots(newType);
          return {
            ...row,
            type: newType,
            cards: row.cards.slice(0, maxSlots), // Trim excess cards
          };
        }
        return row;
      });
      return { rows: newRows };
    });
  }, []);

  // Remove a row
  const removeRow = useCallback((rowId: string) => {
    setLayout(prev => ({
      rows: prev.rows.filter(r => r.id !== rowId && !r.isFixed),
    }));
  }, []);

  // Move row up/down
  const moveRow = useCallback((rowId: string, direction: 'up' | 'down') => {
    setLayout(prev => {
      const index = prev.rows.findIndex(r => r.id === rowId);
      if (index === -1) return prev;
      
      // Can't move the KPI row
      if (prev.rows[index].isFixed) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Can't move before KPI row or beyond bounds
      if (newIndex < 1 || newIndex >= prev.rows.length) return prev;
      if (prev.rows[newIndex].isFixed) return prev;
      
      const newRows = [...prev.rows];
      [newRows[index], newRows[newIndex]] = [newRows[newIndex], newRows[index]];
      
      return { rows: newRows };
    });
  }, []);

  // Remove card from any row
  const removeCard = useCallback((cardId: string) => {
    setLayout(prev => ({
      rows: prev.rows.map(row => ({
        ...row,
        cards: row.cards.filter(c => c.id !== cardId),
      })),
    }));
  }, []);

  // Move card within or between rows
  const moveCard = useCallback((draggedCardId: string, targetCardId: string) => {
    setLayout(prev => {
      // Find source and target rows
      let sourceRowIndex = -1;
      let sourceCardIndex = -1;
      let targetRowIndex = -1;
      let targetCardIndex = -1;
      
      prev.rows.forEach((row, ri) => {
        row.cards.forEach((card, ci) => {
          if (card.id === draggedCardId) {
            sourceRowIndex = ri;
            sourceCardIndex = ci;
          }
          if (card.id === targetCardId) {
            targetRowIndex = ri;
            targetCardIndex = ci;
          }
        });
      });
      
      if (sourceRowIndex === -1 || targetRowIndex === -1) return prev;
      
      const newRows = prev.rows.map(r => ({ ...r, cards: [...r.cards] }));
      
      if (sourceRowIndex === targetRowIndex) {
        // Same row - just reorder
        const row = newRows[sourceRowIndex];
        const [removed] = row.cards.splice(sourceCardIndex, 1);
        row.cards.splice(targetCardIndex, 0, removed);
      } else {
        // Different rows - move between
        const sourceRow = newRows[sourceRowIndex];
        const targetRow = newRows[targetRowIndex];
        const maxSlots = getMaxSlots(targetRow.type);
        
        // Only move if target row has space
        if (targetRow.cards.length < maxSlots) {
          const [removed] = sourceRow.cards.splice(sourceCardIndex, 1);
          targetRow.cards.splice(targetCardIndex, 0, removed);
        }
      }
      
      return { rows: newRows };
    });
  }, []);

  // Move card to a specific row (for dropping on empty row slots)
  const moveCardToRow = useCallback((cardId: string, targetRowId: string, position?: number) => {
    setLayout(prev => {
      let sourceRowIndex = -1;
      let sourceCardIndex = -1;
      let cardEntry: DashboardCardEntry | null = null;
      
      prev.rows.forEach((row, ri) => {
        row.cards.forEach((card, ci) => {
          if (card.id === cardId) {
            sourceRowIndex = ri;
            sourceCardIndex = ci;
            cardEntry = card;
          }
        });
      });
      
      if (!cardEntry) return prev;
      
      const targetRowIndex = prev.rows.findIndex(r => r.id === targetRowId);
      if (targetRowIndex === -1) return prev;
      
      const newRows = prev.rows.map(r => ({ ...r, cards: [...r.cards] }));
      const targetRow = newRows[targetRowIndex];
      const maxSlots = getMaxSlots(targetRow.type);
      
      if (targetRow.cards.length >= maxSlots && sourceRowIndex !== targetRowIndex) {
        return prev; // Target row is full
      }
      
      // Remove from source
      if (sourceRowIndex !== -1) {
        newRows[sourceRowIndex].cards.splice(sourceCardIndex, 1);
      }
      
      // Add to target
      if (position !== undefined) {
        targetRow.cards.splice(position, 0, cardEntry);
      } else {
        targetRow.cards.push(cardEntry);
      }
      
      return { rows: newRows };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setLayout(getDefaultLayout());
  }, []);

  // Get all cards currently in any row
  const getAllCards = useCallback((): DashboardCardEntry[] => {
    return layout.rows.flatMap(r => r.cards);
  }, [layout]);

  // Get cards available to add (not currently in layout)
  const getAvailableToAdd = useCallback(() => {
    const currentIds = getAllCards().map(c => c.id);
    return AVAILABLE_CARDS.filter(card => !currentIds.includes(card.id));
  }, [getAllCards]);

  // For pinned cards from external sources
  const pinCard = useCallback((cardId: string, sourceType: string) => {
    // Add pinned card to a new hero row
    setLayout(prev => {
      // Check if already exists
      if (prev.rows.some(r => r.cards.some(c => c.id === cardId))) {
        return prev;
      }
      
      const newRow: DashboardRow = {
        id: generateRowId(),
        type: 'hero',
        cards: [{ id: cardId, isPinned: true, sourceType }],
      };
      
      return { rows: [...prev.rows, newRow] };
    });
  }, []);

  const unpinCard = useCallback((cardId: string) => {
    removeCard(cardId);
  }, [removeCard]);

  const isPinned = useCallback((cardId: string) => {
    return layout.rows.some(r => r.cards.some(c => c.id === cardId && c.isPinned));
  }, [layout.rows]);

  // Add card to layout (finds appropriate row or creates new one)
  const addCard = useCallback((cardId: string, isPinned = false, sourceType?: string) => {
    setLayout(prev => {
      // Check if already exists
      if (prev.rows.some(r => r.cards.some(c => c.id === cardId))) {
        return prev;
      }
      
      const cardConfig = AVAILABLE_CARDS.find(c => c.id === cardId);
      
      // Find a row with space that matches allowed types
      for (const row of prev.rows) {
        if (row.isFixed) continue;
        const maxSlots = getMaxSlots(row.type);
        if (row.cards.length < maxSlots) {
          const allowed = cardConfig?.allowedRowTypes || ['equal'];
          if (allowed.includes(row.type)) {
            return {
              rows: prev.rows.map(r => 
                r.id === row.id 
                  ? { ...r, cards: [...r.cards, { id: cardId, isPinned, sourceType }] }
                  : r
              ),
            };
          }
        }
      }
      
      // No space found - create new equal row
      const newRow: DashboardRow = {
        id: generateRowId(),
        type: isPinned ? 'hero' : 'equal',
        cards: [{ id: cardId, isPinned, sourceType }],
      };
      
      return { rows: [...prev.rows, newRow] };
    });
  }, []);

  return {
    layout,
    isEditMode,
    toggleEditMode,
    addCard,
    addCardToRow,
    addRow,
    changeRowType,
    removeRow,
    moveRow,
    removeCard,
    moveCard,
    moveCardToRow,
    resetToDefault,
    getAllCards,
    getAvailableToAdd,
    getMaxSlots,
    // Pinning API
    pinCard,
    unpinCard,
    isPinned,
  };
}
