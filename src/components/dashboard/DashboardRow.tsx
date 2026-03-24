import { cn } from "@/lib/utils";
import type { RowType, DashboardRow as DashboardRowType, DashboardCardEntry } from "@/hooks/use-dashboard-layout";
import { RowControls } from "./RowControls";
import { DraggableDashboardCard } from "./DraggableDashboardCard";
import { Plus } from "lucide-react";

type SlotType = "wide" | "narrow" | "equal" | "hero" | "kpi" | "wide-narrow" | "three-equal" | "four-equal";

interface DashboardRowProps {
  row: DashboardRowType;
  rowIndex: number;
  totalRows: number;
  isEditMode: boolean;
  draggingCardId: string | null;
  dragOverCardId: string | null;
  dragOverRowId: string | null;

  // ✅ FIXED TYPE
  renderCardContent: (cardEntry: DashboardCardEntry, slotType: SlotType) => React.ReactNode;

  onDragStart: (cardId: string) => void;
  onDragOver: (cardId: string) => void;
  onDragEnd: () => void;
  onDragOverRow: (rowId: string) => void;
  onRemoveCard: (cardId: string) => void;
  onChangeRowType: (rowId: string, type: RowType) => void;
  onMoveRow: (rowId: string, direction: "up" | "down") => void;
  onRemoveRow: (rowId: string) => void;
  onAddRow: (afterRowId: string) => void;
  maxSlots: number;
}

const getGridClass = (rowType: RowType): string => {
  switch (rowType) {
    case "kpi":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr";
    case "wide-narrow":
      return "grid-cols-1 lg:grid-cols-3";
    case "equal":
      return "grid-cols-1 lg:grid-cols-2";
    case "three-equal":
      return "grid-cols-1 md:grid-cols-3";
    case "four-equal":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    case "hero":
      return "grid-cols-1";
    default:
      return "grid-cols-1 lg:grid-cols-2";
  }
};

const getSlotType = (rowType: RowType, slotIndex: number): SlotType => {
  switch (rowType) {
    case "kpi":
      return "kpi";

    case "wide-narrow":
      return slotIndex === 0 ? "wide" : "narrow";

    case "three-equal":
      return "three-equal";

    case "four-equal":
      return "four-equal";

    case "equal":
      return "equal";

    case "hero":
      return "hero";

    default:
      return "equal";
  }
};

const getSlotClass = (rowType: RowType, slotIndex: number): string => {
  if (rowType === "wide-narrow") {
    return slotIndex === 0 ? "lg:col-span-2" : "lg:col-span-1";
  }
  return "";
};

export function DashboardRow({
  row,
  rowIndex,
  totalRows,
  isEditMode,
  draggingCardId,
  dragOverCardId,
  dragOverRowId,
  renderCardContent,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragOverRow,
  onRemoveCard,
  onChangeRowType,
  onMoveRow,
  onRemoveRow,
  onAddRow,
  maxSlots,
}: DashboardRowProps) {
  const canMoveUp = rowIndex > 1;
  const canMoveDown = rowIndex < totalRows - 1;
  const emptySlots = maxSlots - row.cards.length;

  const handleRowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingCardId) {
      onDragOverRow(row.id);
    }
  };

  return (
    <div className="space-y-2">
      {isEditMode && (
        <div className="flex items-center justify-between">
          <RowControls
            rowId={row.id}
            rowType={row.type}
            isFixed={row.isFixed}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onChangeType={onChangeRowType}
            onMoveRow={onMoveRow}
            onRemoveRow={onRemoveRow}
            onAddRow={onAddRow}
          />
        </div>
      )}

      <div
        className={cn(
          "grid gap-5",
          getGridClass(row.type),
          isEditMode &&
            dragOverRowId === row.id &&
            "ring-2 ring-primary/50 ring-offset-2 ring-offset-background rounded-lg",
        )}
        onDragOver={handleRowDragOver}
      >
        {row.cards.map((cardEntry, cardIndex) => {
          const slotType = getSlotType(row.type, cardIndex);
          const slotClass = getSlotClass(row.type, cardIndex);
          const content = renderCardContent(cardEntry, slotType);

          if (!content) return null;

          return (
            <DraggableDashboardCard
              key={cardEntry.id}
              cardId={cardEntry.id}
              isEditMode={isEditMode}
              onRemove={onRemoveCard}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              isDragging={draggingCardId === cardEntry.id}
              isDragOver={dragOverCardId === cardEntry.id}
              className={slotClass}
            >
              {content}
            </DraggableDashboardCard>
          );
        })}

        {isEditMode &&
          emptySlots > 0 &&
          Array.from({ length: emptySlots }).map((_, i) => {
            const slotIndex = row.cards.length + i;
            const slotClass = getSlotClass(row.type, slotIndex);

            return (
              <div
                key={`empty-${i}`}
                className={cn(
                  "border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 flex items-center justify-center min-h-[120px]",
                  slotClass,
                )}
              >
                <div className="text-center text-muted-foreground/50">
                  <Plus className="h-6 w-6 mx-auto mb-1" />
                  <span className="text-xs">Drop card here</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
