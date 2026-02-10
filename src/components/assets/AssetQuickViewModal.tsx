import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AssetDetailContent } from "@/pages/AssetDetail";

interface AssetQuickViewModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetQuickViewModal({ symbol, isOpen, onClose }: AssetQuickViewModalProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay (ABOVE EventDetailsModal overlay/content) */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300]"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        />

        {/* Content */}
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto scrollbar-hidden bg-background border border-border p-0 rounded-lg z-[301]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <AssetDetailContent symbol={symbol} onRequestClose={onClose} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
