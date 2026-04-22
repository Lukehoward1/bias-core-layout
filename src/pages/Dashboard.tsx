// src/pages/Dashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

import { Clock, Plus } from "lucide-react";

import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { DashboardEditToolbar } from "@/components/dashboard/DashboardEditToolbar";
import { DashboardRow } from "@/components/dashboard/DashboardRow";
import { AddCardsModal } from "@/components/dashboard/AddCardsModal";

import { getCardRenderer, warnMissingRenderers } from "@/data/dashboardCardRenderers";
import { DASHBOARD_CARD_REGISTRY } from "@/data/dashboardCardRegistry";
import { cn } from "@/lib/utils";

import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";

type TradingSessionName = "Sydney" | "Asia" | "London" | "New York";

type TradingSession = {
  name: TradingSessionName;
  region: string;
  status: "active" | "closed";
  accent: string;
  opensAtLabel: string;
  closesAtLabel: string;
  timeRemainingLabel: string;
  timeRemainingSeconds: number;
};

type DashboardSlotType = "wide" | "narrow" | "equal" | "hero" | "kpi" | "wide-narrow" | "three-equal" | "four-equal";

const buildSessions = (): TradingSession[] => [
  {
    name: "Sydney",
    region: "Asia-Pacific",
    status: "closed",
    accent: "#2EC4B6",
    opensAtLabel: "Opens 08:30",
    closesAtLabel: "—",
    timeRemainingLabel: "Session opens in",
    timeRemainingSeconds: 8 * 3600 + 30 * 60,
  },
  {
    name: "Asia",
    region: "Asia-Pacific Markets",
    status: "active",
    accent: "#4361EE",
    opensAtLabel: "—",
    closesAtLabel: "Closes 01:23",
    timeRemainingLabel: "Session closes in",
    timeRemainingSeconds: 1 * 3600 + 23 * 60 + 45,
  },
  {
    name: "London",
    region: "European",
    status: "closed",
    accent: "#F4D35E",
    opensAtLabel: "Opens 02:15",
    closesAtLabel: "—",
    timeRemainingLabel: "Session opens in",
    timeRemainingSeconds: 2 * 3600 + 15 * 60 + 30,
  },
  {
    name: "New York",
    region: "US Markets",
    status: "closed",
    accent: "#F77F00",
    opensAtLabel: "Opens 05:45",
    closesAtLabel: "—",
    timeRemainingLabel: "Session opens in",
    timeRemainingSeconds: 5 * 3600 + 45 * 60 + 12,
  },
];

export default function Dashboard() {
  const [showAddCardsModal, setShowAddCardsModal] = useState(false);

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [selectedSessionName, setSelectedSessionName] = useState<TradingSessionName>("Asia");

  const sessions = useMemo(() => buildSessions(), []);
  const selectedSession = useMemo(() => {
    const found = sessions.find((s) => s.name === selectedSessionName);
    return found ?? sessions.find((s) => s.status === "active") ?? sessions[0];
  }, [sessions, selectedSessionName]);

  const [sessionTick, setSessionTick] = useState(0);

  useEffect(() => {
    if (!isSessionModalOpen) return;
    const t = window.setInterval(() => setSessionTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [isSessionModalOpen]);

  const selectedSessionWithTick = useMemo(() => {
    const dec = isSessionModalOpen ? sessionTick : 0;
    const next = Math.max(0, (selectedSession?.timeRemainingSeconds ?? 0) - dec);
    return { ...selectedSession, timeRemainingSeconds: next } as TradingSession;
  }, [selectedSession, sessionTick, isSessionModalOpen]);

  const openSessionModal = useCallback(
    (name?: TradingSessionName) => {
      setIsSessionModalOpen(false);

      requestAnimationFrame(() => {
        if (name) {
          setSelectedSessionName(name);
        } else {
          const active = sessions.find((s) => s.status === "active")?.name ?? "Asia";
          setSelectedSessionName(active);
        }
        setIsSessionModalOpen(true);
      });
    },
    [sessions],
  );

  const closeSessionModal = useCallback(() => setIsSessionModalOpen(false), []);

  const {
    layout,
    isEditMode,
    toggleEditMode,
    addCard,
    addRow,
    changeRowType,
    removeRow,
    moveRow,
    removeCard,
    moveCard,
    moveCardToRow,
    resetToDefault,
    getMaxSlots,
  } = useDashboardLayout();

  const cardsOnDashboardSet = useMemo(() => {
    const ids = new Set<string>();
    layout.rows.forEach((row) => row.cards.forEach((card) => ids.add(card.id)));
    return ids;
  }, [layout]);

  const handleDragStart = (cardId: string) => setDraggingCardId(cardId);

  const handleDragOver = (cardId: string) => {
    if (draggingCardId && cardId !== draggingCardId) {
      setDragOverCardId(cardId);
    }
  };

  const handleDragOverRow = (rowId: string) => {
    if (draggingCardId) {
      setDragOverRowId(rowId);
    }
  };

  const handleDragEnd = () => {
    if (draggingCardId && dragOverCardId) {
      moveCard(draggingCardId, dragOverCardId);
    } else if (draggingCardId && dragOverRowId) {
      moveCardToRow(draggingCardId, dragOverRowId);
    }

    setDraggingCardId(null);
    setDragOverCardId(null);
    setDragOverRowId(null);
  };

  useEffect(() => {
    const registryCardIds = DASHBOARD_CARD_REGISTRY.map((c) => c.id);
    warnMissingRenderers(registryCardIds);
  }, []);

  const renderCardContent = (cardEntry: { id: string }, slotType: DashboardSlotType): React.ReactNode => {
    const cardId = cardEntry.id;

    if (cardId === "next-session") {
      const active = sessions.find((s) => s.status === "active")?.name ?? "Asia";

      return (
        <div
          className={cn("h-full", !isEditMode && "cursor-pointer")}
          onClick={() => {
            if (isEditMode) return;
            openSessionModal(active);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (isEditMode) return;
            if (e.key === "Enter" || e.key === " ") openSessionModal(active);
          }}
        >
          {getCardRenderer(cardId)?.({ slotType })}
        </div>
      );
    }

    const renderer = getCardRenderer(cardId);

    if (renderer) {
      return renderer({ slotType });
    }

    return (
      <div className="h-full rounded-xl border border-warning/30 bg-warning/5 p-4">
        <p className="text-sm font-medium text-warning">Unknown Card</p>
        <p className="text-xs text-muted-foreground mt-2">Card ID: {cardId}</p>
      </div>
    );
  };

  const handleAddRow = (afterRowId?: string) => addRow("equal", afterRowId);

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Dashboard" />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">Welcome, Trader</h1>
            {isEditMode && (
              <p className="text-sm text-muted-foreground">
                Drag cards to reorder • Click × to remove • Change row layouts
              </p>
            )}
          </div>

          <DashboardEditToolbar
            isEditMode={isEditMode}
            onToggleEdit={toggleEditMode}
            onReset={resetToDefault}
            onOpenAddCards={() => setShowAddCardsModal(true)}
          />
        </div>

        {layout.rows.map((row, index) => (
          <DashboardRow
            key={row.id}
            row={row}
            rowIndex={index}
            totalRows={layout.rows.length}
            isEditMode={isEditMode}
            draggingCardId={draggingCardId}
            dragOverCardId={dragOverCardId}
            dragOverRowId={dragOverRowId}
            renderCardContent={renderCardContent}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragOverRow={handleDragOverRow}
            onRemoveCard={removeCard}
            onChangeRowType={changeRowType}
            onMoveRow={moveRow}
            onRemoveRow={removeRow}
            onAddRow={handleAddRow}
            maxSlots={getMaxSlots(row.type)}
          />
        ))}

        {isEditMode && (
          <Button variant="outline" className="w-full border-dashed gap-2" onClick={() => handleAddRow()}>
            <Plus className="h-4 w-4" />
            Add New Row
          </Button>
        )}

        {layout.rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">No cards on your Dashboard.</p>
            <p className="text-sm text-muted-foreground">Click "Edit Dashboard" and then "Add Cards" to customize.</p>
          </div>
        )}
      </div>

      <AddCardsModal
        open={showAddCardsModal}
        onOpenChange={setShowAddCardsModal}
        cardsOnDashboard={cardsOnDashboardSet}
        onAddCard={addCard}
        onRemoveCard={removeCard}
      />

      <SessionDetailsModal isOpen={isSessionModalOpen} onClose={closeSessionModal} session={selectedSessionWithTick} />
    </div>
  );
}
