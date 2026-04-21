import { useState, useEffect, useCallback } from "react";
import { DASHBOARD_CARD_REGISTRY, isCardEligible } from "@/data/dashboardCardRegistry";

export type RowType = "kpi" | "wide-narrow" | "equal" | "hero" | "three-equal" | "four-equal";

// Derive AVAILABLE_CARDS from registry for backwards compatibility
export const AVAILABLE_CARDS = DASHBOARD_CARD_REGISTRY.map((card) => ({
  id: card.id,
  title: card.title,
  description: card.description,
  category: card.category,
  allowedRowTypes: card.allowedRowTypes,
}));

// ✅ Bump this any time defaults change, to invalidate old saved layouts
const STORAGE_KEY = "streambias-dashboard-layout-v6";

export interface DashboardCardEntry {
  id: string;
  isPinned: boolean;
  sourceType?: string;
}

export interface DashboardRow {
  id: string;
  type: RowType;
  cards: DashboardCardEntry[];
  isFixed?: boolean;
}

interface DashboardLayout {
  rows: DashboardRow[];
}

const generateRowId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getDefaultLayout = (): DashboardLayout => ({
  rows: [
    {
      id: "hero-row",
      type: "hero",
      cards: [{ id: "top-news", isPinned: false }],
    },
    {
      id: "awareness-row",
      type: "three-equal",
      cards: [
        { id: "watchlist-overview", isPinned: false },
        { id: "session-timers", isPinned: false },
        { id: "upcoming-events", isPinned: false },
      ],
    },
    {
      id: "execution-row",
      type: "equal",
      cards: [
        { id: "alerts-summary", isPinned: false },
        { id: "risk-snapshot", isPinned: false },
      ],
    },
  ],
});

const isRowType = (value: unknown): value is RowType => {
  return (
    value === "kpi" ||
    value === "wide-narrow" ||
    value === "equal" ||
    value === "hero" ||
    value === "three-equal" ||
    value === "four-equal"
  );
};

const getMaxSlotsForRowType = (rowType: RowType): number => {
  switch (rowType) {
    case "kpi":
      return 4;
    case "wide-narrow":
      return 2;
    case "equal":
      return 2;
    case "three-equal":
      return 3;
    case "four-equal":
      return 4;
    case "hero":
      return 1;
    default:
      return 2;
  }
};

/**
 * Ensures persisted layout data can never crash rendering or break hook order.
 * If localStorage is corrupted or from an older schema, we fall back to defaults.
 */
const normalizeLayout = (raw: unknown): DashboardLayout => {
  const fallback = getDefaultLayout();

  if (!raw || typeof raw !== "object") return fallback;

  const rowsRaw = (raw as { rows?: unknown }).rows;
  if (!Array.isArray(rowsRaw)) return fallback;

  const normalizedRows: DashboardRow[] = rowsRaw
    .filter(Boolean)
    .map((row): DashboardRow | null => {
      if (!row || typeof row !== "object") return null;

      const r = row as Partial<DashboardRow> & { cards?: unknown };

      const id = typeof r.id === "string" ? r.id : generateRowId();
      const type: RowType = isRowType(r.type) ? r.type : "equal";
      const isFixed = Boolean(r.isFixed);

      const cardsRaw = Array.isArray(r.cards) ? r.cards : [];
      const cards: DashboardCardEntry[] = cardsRaw
        .filter(Boolean)
        .map((c): DashboardCardEntry | null => {
          if (!c || typeof c !== "object") return null;
          const ce = c as Partial<DashboardCardEntry>;
          if (typeof ce.id !== "string" || !ce.id) return null;

          // Safety filter: only keep cards that exist in the registry
          if (!isCardEligible(ce.id)) {
            console.warn(`Filtered unknown card from layout: ${ce.id}`);
            return null;
          }

          return {
            id: ce.id,
            isPinned: Boolean(ce.isPinned),
            sourceType: typeof ce.sourceType === "string" ? ce.sourceType : undefined,
          };
        })
        .filter((c): c is DashboardCardEntry => Boolean(c));

      // De-dupe by id while preserving order
      const seen = new Set<string>();
      const deduped = cards.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      const maxSlots = getMaxSlotsForRowType(type);
      return {
        id,
        type,
        isFixed,
        cards: deduped.slice(0, maxSlots),
      };
    })
    .filter((r): r is DashboardRow => Boolean(r));

  // ✅ KPI row must exist and always match DEFAULT KPI IDs (not hardcoded High Impact)
  const defaultKpiIds = getDefaultLayout().rows[0].cards.map((c) => c.id);
  const existingKpi = normalizedRows.find((r) => r.id === "kpi-row" || r.type === "kpi" || r.isFixed);

  const existingKpiIds = (existingKpi?.cards ?? []).map((c) => c.id).filter((id) => defaultKpiIds.includes(id));

  const finalKpiIds = [...existingKpiIds, ...defaultKpiIds.filter((id) => !existingKpiIds.includes(id))].slice(0, 4);

  const kpiRow: DashboardRow = {
    id: "kpi-row",
    type: "kpi",
    isFixed: true,
    cards: finalKpiIds.map((id) => ({ id, isPinned: false })),
  };

  const nonKpiRows = normalizedRows.filter((r) => r !== existingKpi && !r.isFixed && r.type !== "kpi");

  return {
    rows: [kpiRow, ...nonKpiRows],
  };
};

// Migrate from old v2 format
const migrateOldLayout = (): DashboardLayout | null => {
  try {
    const oldSaved = localStorage.getItem("streambias-dashboard-layout-v2");
    if (oldSaved) {
      const oldLayout = JSON.parse(oldSaved);
      if (oldLayout.cards && Array.isArray(oldLayout.cards)) {
        const defaultLayout = getDefaultLayout();

        // ✅ Update KPI mapping to match new default KPI set
        const kpiCards = ["todays-bias", "active-trades", "next-session", "rr-calculator"];
        const analysisCards = ["watchlist-overview", "session-timers", "risk-snapshot"];
        const overviewCards = ["upcoming-events", "performance-overview", "journal-summary", "calendar-events"];

        const oldCards: DashboardCardEntry[] = oldLayout.cards;

        // KPI row
        defaultLayout.rows[0].cards = oldCards.filter((c) => kpiCards.includes(c.id));

        // Analysis row (wide-narrow)
        const analysisEntries = oldCards.filter((c) => analysisCards.includes(c.id));
        if (analysisEntries.length > 0) {
          defaultLayout.rows[1].cards = analysisEntries.slice(0, 2);
        }

        // Overview row (equal)
        const overviewEntries = oldCards.filter((c) => overviewCards.includes(c.id));
        if (overviewEntries.length > 0) {
          defaultLayout.rows[2].cards = overviewEntries.slice(0, 2);
        }

        // Add remaining cards as new equal rows
        const assignedIds = [
          ...defaultLayout.rows[0].cards.map((c) => c.id),
          ...defaultLayout.rows[1].cards.map((c) => c.id),
          ...defaultLayout.rows[2].cards.map((c) => c.id),
        ];

        const remainingCards = oldCards.filter((c) => !assignedIds.includes(c.id));
        for (let i = 0; i < remainingCards.length; i += 2) {
          const rowCards = remainingCards.slice(i, i + 2);
          if (rowCards.length > 0) {
            defaultLayout.rows.push({
              id: generateRowId(),
              type: rowCards[0].isPinned ? "hero" : "equal",
              cards: rowCards,
            });
          }
        }

        localStorage.removeItem("streambias-dashboard-layout-v2");
        return defaultLayout;
      }
    }
  } catch (e) {
    console.warn("Failed to migrate old layout:", e);
  }
  return null;
};

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return normalizeLayout(JSON.parse(saved));
      }

      const migrated = migrateOldLayout();
      if (migrated) {
        return normalizeLayout(migrated);
      }
    } catch (e) {
      console.warn("Failed to load dashboard layout:", e);
    }
    return getDefaultLayout();
  });

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {
      console.warn("Failed to save dashboard layout:", e);
    }
  }, [layout]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  const getMaxSlots = useCallback((rowType: RowType): number => {
    return getMaxSlotsForRowType(rowType);
  }, []);

  const addCardToRow = useCallback(
    (rowId: string, cardId: string, isPinned = false, sourceType?: string) => {
      setLayout((prev) => {
        const newRows = prev.rows.map((row) => {
          if (row.id === rowId) {
            const maxSlots = getMaxSlots(row.type);
            if (row.cards.length >= maxSlots) return row;
            if (row.cards.some((c) => c.id === cardId)) return row;
            return {
              ...row,
              cards: [...row.cards, { id: cardId, isPinned, sourceType }],
            };
          }
          return row;
        });
        return { rows: newRows };
      });
    },
    [getMaxSlots],
  );

  const addRow = useCallback((type: RowType = "equal", afterRowId?: string) => {
    setLayout((prev) => {
      const newRow: DashboardRow = {
        id: generateRowId(),
        type,
        cards: [],
      };

      if (afterRowId) {
        const index = prev.rows.findIndex((r) => r.id === afterRowId);
        if (index !== -1) {
          const newRows = [...prev.rows];
          newRows.splice(index + 1, 0, newRow);
          return { rows: newRows };
        }
      }

      return { rows: [...prev.rows, newRow] };
    });
  }, []);

  const changeRowType = useCallback(
    (rowId: string, newType: RowType) => {
      setLayout((prev) => {
        const newRows = prev.rows.map((row) => {
          if (row.id === rowId && !row.isFixed) {
            const maxSlots = getMaxSlots(newType);
            return {
              ...row,
              type: newType,
              cards: row.cards.slice(0, maxSlots),
            };
          }
          return row;
        });
        return { rows: newRows };
      });
    },
    [getMaxSlots],
  );

  const removeRow = useCallback((rowId: string) => {
    setLayout((prev) => ({
      rows: prev.rows.filter((r) => r.id !== rowId && !r.isFixed),
    }));
  }, []);

  const moveRow = useCallback((rowId: string, direction: "up" | "down") => {
    setLayout((prev) => {
      const index = prev.rows.findIndex((r) => r.id === rowId);
      if (index === -1) return prev;
      if (prev.rows[index].isFixed) return prev;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 1 || newIndex >= prev.rows.length) return prev;
      if (prev.rows[newIndex].isFixed) return prev;

      const newRows = [...prev.rows];
      [newRows[index], newRows[newIndex]] = [newRows[newIndex], newRows[index]];
      return { rows: newRows };
    });
  }, []);

  const removeCard = useCallback((cardId: string) => {
    setLayout((prev) => ({
      rows: prev.rows.map((row) => ({
        ...row,
        cards: row.cards.filter((c) => c.id !== cardId),
      })),
    }));
  }, []);

  const moveCard = useCallback(
    (draggedCardId: string, targetCardId: string) => {
      setLayout((prev) => {
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

        const newRows = prev.rows.map((r) => ({ ...r, cards: [...r.cards] }));

        if (sourceRowIndex === targetRowIndex) {
          const row = newRows[sourceRowIndex];
          const [removed] = row.cards.splice(sourceCardIndex, 1);
          row.cards.splice(targetCardIndex, 0, removed);
        } else {
          const sourceRow = newRows[sourceRowIndex];
          const targetRow = newRows[targetRowIndex];
          const maxSlots = getMaxSlots(targetRow.type);

          if (targetRow.cards.length < maxSlots) {
            const [removed] = sourceRow.cards.splice(sourceCardIndex, 1);
            targetRow.cards.splice(targetCardIndex, 0, removed);
          }
        }

        return { rows: newRows };
      });
    },
    [getMaxSlots],
  );

  const moveCardToRow = useCallback(
    (cardId: string, targetRowId: string, position?: number) => {
      setLayout((prev) => {
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

        const targetRowIndex = prev.rows.findIndex((r) => r.id === targetRowId);
        if (targetRowIndex === -1) return prev;

        const newRows = prev.rows.map((r) => ({ ...r, cards: [...r.cards] }));
        const targetRow = newRows[targetRowIndex];
        const maxSlots = getMaxSlots(targetRow.type);

        if (targetRow.cards.length >= maxSlots && sourceRowIndex !== targetRowIndex) {
          return prev;
        }

        if (sourceRowIndex !== -1) {
          newRows[sourceRowIndex].cards.splice(sourceCardIndex, 1);
        }

        if (position !== undefined) {
          targetRow.cards.splice(position, 0, cardEntry);
        } else {
          targetRow.cards.push(cardEntry);
        }

        return { rows: newRows };
      });
    },
    [getMaxSlots],
  );

  const resetToDefault = useCallback(() => {
    setLayout(getDefaultLayout());
  }, []);

  const getAllCards = useCallback((): DashboardCardEntry[] => {
    return layout.rows.flatMap((r) => r.cards);
  }, [layout.rows]);

  const getAvailableToAdd = useCallback(() => {
    const currentIds = getAllCards().map((c) => c.id);
    return AVAILABLE_CARDS.filter((card) => !currentIds.includes(card.id));
  }, [getAllCards]);

  const pinCard = useCallback((cardId: string, sourceType: string) => {
    setLayout((prev) => {
      if (prev.rows.some((r) => r.cards.some((c) => c.id === cardId))) {
        return prev;
      }

      const newRow: DashboardRow = {
        id: generateRowId(),
        type: "hero",
        cards: [{ id: cardId, isPinned: true, sourceType }],
      };

      return { rows: [...prev.rows, newRow] };
    });
  }, []);

  const unpinCard = useCallback(
    (cardId: string) => {
      removeCard(cardId);
    },
    [removeCard],
  );

  const isPinned = useCallback(
    (cardId: string) => {
      return layout.rows.some((r) => r.cards.some((c) => c.id === cardId && c.isPinned));
    },
    [layout.rows],
  );

  const addCard = useCallback(
    (cardId: string, isPinned = false, sourceType?: string) => {
      setLayout((prev) => {
        if (prev.rows.some((r) => r.cards.some((c) => c.id === cardId))) {
          return prev;
        }

        const cardConfig = AVAILABLE_CARDS.find((c) => c.id === cardId);

        for (const row of prev.rows) {
          if (row.isFixed) continue;
          const maxSlots = getMaxSlots(row.type);
          if (row.cards.length < maxSlots) {
            const allowed = cardConfig?.allowedRowTypes || ["equal"];
            if (allowed.includes(row.type)) {
              return {
                rows: prev.rows.map((r) =>
                  r.id === row.id ? { ...r, cards: [...r.cards, { id: cardId, isPinned, sourceType }] } : r,
                ),
              };
            }
          }
        }

        const newRow: DashboardRow = {
          id: generateRowId(),
          type: isPinned ? "hero" : "equal",
          cards: [{ id: cardId, isPinned, sourceType }],
        };

        return { rows: [...prev.rows, newRow] };
      });
    },
    [getMaxSlots],
  );

  const isCardOnDashboard = useCallback(
    (cardId: string): boolean => {
      return layout.rows.some((r) => r.cards.some((c) => c.id === cardId));
    },
    [layout.rows],
  );

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
    pinCard,
    unpinCard,
    isPinned,
    isCardOnDashboard,
  };
}
