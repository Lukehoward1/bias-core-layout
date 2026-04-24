import { useRef } from "react";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableDashboardCardProps {
  cardId: string;
  isEditMode: boolean;
  onRemove: (cardId: string) => void;
  onDragStart: (cardId: string) => void;
  onDragOver: (cardId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DraggableDashboardCard({
  cardId,
  isEditMode,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
  children,
  className,
}: DraggableDashboardCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cardId);
    onDragStart(cardId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(cardId);
  };

  const handleDragEnd = () => {
    if (!isEditMode) return;
    onDragEnd();
  };

  return (
    <div
      ref={cardRef}
      draggable={isEditMode}
      onDragStart={isEditMode ? handleDragStart : undefined}
      onDragOver={isEditMode ? handleDragOver : undefined}
      onDragEnd={isEditMode ? handleDragEnd : undefined}
      className={cn(
        "relative transition-all duration-200",
        isEditMode && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 scale-[0.98]",
        isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className,
      )}
    >
      {isEditMode && (
        <>
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded bg-muted/80 opacity-60 hover:opacity-100 transition-opacity pointer-events-none">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(cardId);
            }}
            className="absolute -top-2 -right-2 z-20 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-md"
            aria-label="Remove card"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="absolute inset-0 border-2 border-dashed border-muted-foreground/30 rounded-lg pointer-events-none" />
        </>
      )}

      {children}
    </div>
  );
}