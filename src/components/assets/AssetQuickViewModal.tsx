import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AssetDetailContent } from "@/pages/AssetDetail";

interface AssetQuickViewModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetQuickViewModal({ symbol, isOpen, onClose }: AssetQuickViewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        stack
        className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto scrollbar-hidden bg-background border-border p-0"
        onPointerDown={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => {
          // Prevent focus jumps when opening nested modals
          e.preventDefault();
        }}
      >
        <AssetDetailContent symbol={symbol} onRequestClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
