import React from "react";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { AssetDetailContent } from "@/pages/AssetDetail";

interface AssetQuickViewModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetQuickViewModal({ symbol, isOpen, onClose }: AssetQuickViewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      <DialogContent
        className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto scrollbar-hidden bg-background border-border p-0 z-[201]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <AssetDetailContent symbol={symbol} onRequestClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
