// src/components/trade/PositionSizeSlideOver.tsx
// Right-side slide-over (plan §2.4) that stacks the existing risk calculators
// plus the full Dynamic Risk Advisor. Each calculator takes a `prefill` prop
// so the user lands with values already derived from the Trade screen:
//   - pair (from Trade's currentSymbol)
//   - entry price (live mid, or user-marked entry via InATradeButton)
//   - stop price + stop-distance (derived from InATradeButton if set)
//   - account balance (pass-through if Trade has it — optional)

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PositionSizeCalculator,
  type PositionSizePrefill,
} from "@/components/risk/PositionSizeCalculator";
import {
  QuickRiskCalculator,
  type QuickRiskPrefill,
} from "@/components/risk/QuickRiskCalculator";
import {
  RiskRewardCalculator,
  type RiskRewardPrefill,
} from "@/components/risk/RiskRewardCalculator";
import { DynamicRiskAdvisor } from "@/components/risk/DynamicRiskAdvisor";

export interface PositionSizeSlideOverPrefill {
  symbol: string;
  entryPrice: number | null;
  stopPrice: number | null;
  targetPrice?: number | null;
  stopPips?: number;
  accountBalance?: number;
}

export interface PositionSizeSlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: PositionSizeSlideOverPrefill;
}

export function PositionSizeSlideOver({ open, onOpenChange, prefill }: PositionSizeSlideOverProps) {
  const positionPrefill: PositionSizePrefill = {
    instrument: prefill.symbol,
    entryPrice: prefill.entryPrice ?? undefined,
    stopLoss: prefill.stopPrice ?? undefined,
    takeProfit: prefill.targetPrice ?? undefined,
    accountBalance: prefill.accountBalance,
  };

  const quickPrefill: QuickRiskPrefill = {
    instrument: prefill.symbol,
    stopDistance: prefill.stopPips,
    accountBalance: prefill.accountBalance,
  };

  const rrPrefill: RiskRewardPrefill = {
    stopDistance: prefill.stopPips,
    accountBalance: prefill.accountBalance,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Risk tools — {prefill.symbol}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6">
          <PositionSizeCalculator prefill={positionPrefill} />
          <QuickRiskCalculator prefill={quickPrefill} />
          <RiskRewardCalculator prefill={rrPrefill} />
          <DynamicRiskAdvisor />
        </div>
      </SheetContent>
    </Sheet>
  );
}
