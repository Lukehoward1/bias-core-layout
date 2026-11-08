// src/components/trade/InATradeButton.tsx
// Manual "I'm in a trade" entry marker (plan §2.4 / §2.11).
//
// Inactive state → button opens an inline form (direction, entry default = live
// mid, optional stop/target). Submit activates the trade.
// Active state  → "In trade since hh:mm @ entry" summary + Exit button.
// Exit currently stubs the journal prefill via toast — the real journal entry
// form is inline inside src/pages/Journal.tsx and isn't exposed as a reusable
// component. Journal protection (plan §2.7) rules out extracting it in this stage.
// Chart overlay is a console.log stub; actual price-line overlays are Stage 4.

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X } from "lucide-react";

export type TradeDirection = "long" | "short";

export interface EntryIntent {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  stopPrice?: number;
  targetPrice?: number;
  openedAt: number; // ms since epoch
}

export interface InATradeButtonProps {
  symbol: string;
  liveMidPrice: number | null;
  active: boolean;
  entry: EntryIntent | null;
  displayDecimals?: number;
  onEnter: (entry: EntryIntent) => void;
  onExit: () => void;
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toNum(s: string): number | undefined {
  const v = s.trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function InATradeButton({
  symbol,
  liveMidPrice,
  active,
  entry,
  displayDecimals = 5,
  onEnter,
  onExit,
}: InATradeButtonProps) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<TradeDirection>("long");
  const [entryInput, setEntryInput] = useState<string>("");
  const [stopInput, setStopInput] = useState<string>("");
  const [targetInput, setTargetInput] = useState<string>("");

  // Seed the entry field with live mid when the form opens.
  useEffect(() => {
    if (open && liveMidPrice !== null) {
      setEntryInput((prev) => (prev ? prev : liveMidPrice.toFixed(displayDecimals)));
    }
  }, [open, liveMidPrice, displayDecimals]);

  if (active && entry) {
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            {entry.direction === "long" ? "Long" : "Short"} since {fmtTime(entry.openedAt)}
          </div>
          <div className="text-sm font-medium text-foreground truncate">
            @ {entry.entryPrice.toFixed(displayDecimals)}
            {entry.stopPrice !== undefined && (
              <span className="text-muted-foreground"> · SL {entry.stopPrice.toFixed(displayDecimals)}</span>
            )}
            {entry.targetPrice !== undefined && (
              <span className="text-muted-foreground"> · TP {entry.targetPrice.toFixed(displayDecimals)}</span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onExit();
            toast("Journal prefill coming", {
              description: "Add-trade dialog isn't exposed as a reusable component yet; log the trade in the Journal page.",
            });
          }}
        >
          Exit
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        I'm in a trade
      </Button>
    );
  }

  const submit = () => {
    const entryPrice = toNum(entryInput) ?? liveMidPrice;
    if (entryPrice === null || entryPrice === undefined) {
      toast.error("Enter a price");
      return;
    }
    const stopPrice = toNum(stopInput);
    const targetPrice = toNum(targetInput);
    const intent: EntryIntent = {
      symbol,
      direction,
      entryPrice,
      stopPrice,
      targetPrice,
      openedAt: Date.now(),
    };
    // Chart overlay wiring is Stage 4. For now just log the intent.
    // eslint-disable-next-line no-console
    console.log("[InATradeButton] entry intent (overlay stub):", intent);
    onEnter(intent);
    setOpen(false);
    setEntryInput("");
    setStopInput("");
    setTargetInput("");
  };

  return (
    <div className="rounded-lg border border-border bg-card/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">Mark trade entry</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant={direction === "long" ? "default" : "outline"}
          onClick={() => setDirection("long")}
        >
          Long
        </Button>
        <Button
          size="sm"
          variant={direction === "short" ? "default" : "outline"}
          onClick={() => setDirection("short")}
        >
          Short
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="entry-price" className="text-xs">
          Entry
        </Label>
        <Input
          id="entry-price"
          inputMode="decimal"
          value={entryInput}
          onChange={(e) => setEntryInput(e.target.value)}
          placeholder={liveMidPrice !== null ? liveMidPrice.toFixed(displayDecimals) : ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="sl-price" className="text-xs">
            Stop (optional)
          </Label>
          <Input
            id="sl-price"
            inputMode="decimal"
            value={stopInput}
            onChange={(e) => setStopInput(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tp-price" className="text-xs">
            Target (optional)
          </Label>
          <Input
            id="tp-price"
            inputMode="decimal"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
          />
        </div>
      </div>

      <Button size="sm" className="w-full" onClick={submit}>
        Start tracking trade
      </Button>
    </div>
  );
}
