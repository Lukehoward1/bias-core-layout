import { useRef } from 'react';
import { X, GripVertical, MoreHorizontal, Maximize2, Minimize2, Square, RectangleHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardSize, getCardAllowedSizes, getCardTitle } from '@/hooks/use-dashboard-layout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DraggableDashboardCardProps {
  cardId: string;
  sourceType?: string;
  isEditMode: boolean;
  currentSize: CardSize;
  onRemove: (cardId: string) => void;
  onSizeChange: (cardId: string, size: CardSize) => void;
  onDragStart: (cardId: string) => void;
  onDragOver: (cardId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  children: React.ReactNode;
  className?: string;
}

const SIZE_LABELS: Record<CardSize, string> = {
  compact: 'Compact',
  standard: 'Standard',
  wide: 'Wide',
  hero: 'Hero',
};

const SIZE_ICONS: Record<CardSize, React.ReactNode> = {
  compact: <Minimize2 className="h-3.5 w-3.5" />,
  standard: <Square className="h-3.5 w-3.5" />,
  wide: <RectangleHorizontal className="h-3.5 w-3.5" />,
  hero: <Maximize2 className="h-3.5 w-3.5" />,
};

export function DraggableDashboardCard({
  cardId,
  sourceType,
  isEditMode,
  currentSize,
  onRemove,
  onSizeChange,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
  children,
  className,
}: DraggableDashboardCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const allowedSizes = getCardAllowedSizes(cardId, sourceType);
  const cardTitle = getCardTitle(cardId, sourceType);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
    onDragStart(cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver(cardId);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  return (
    <div
      ref={cardRef}
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      className={cn(
        'relative transition-all duration-200',
        isEditMode && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 scale-[0.98]',
        isDragOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
    >
      {isEditMode && (
        <>
          {/* Drag handle indicator */}
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded bg-muted/80 opacity-60 hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(cardId);
            }}
            className="absolute -top-2 -right-2 z-10 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-md"
            aria-label="Remove card"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Size menu */}
          {allowedSizes.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="absolute -top-2 right-6 z-10 p-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors shadow-md"
                  aria-label="Change size"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs truncate">{cardTitle}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allowedSizes.map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => onSizeChange(cardId, size)}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer',
                      currentSize === size && 'bg-accent'
                    )}
                  >
                    {SIZE_ICONS[size]}
                    <span>{SIZE_LABELS[size]}</span>
                    {currentSize === size && (
                      <span className="ml-auto text-xs text-muted-foreground">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Edit mode outline */}
          <div className="absolute inset-0 border-2 border-dashed border-muted-foreground/30 rounded-lg pointer-events-none" />
        </>
      )}
      {children}
    </div>
  );
}
