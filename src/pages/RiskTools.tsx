import { AppHeader } from "@/components/AppHeader";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { toast } from "sonner";
import { QuickRiskCalculator } from "@/components/risk/QuickRiskCalculator";
import { PositionSizeCalculator } from "@/components/risk/PositionSizeCalculator";
import { RiskRewardCalculator } from "@/components/risk/RiskRewardCalculator";
import { DailyRiskLimitTracker } from "@/components/risk/DailyRiskLimitTracker";
import { MaxDrawdownGuard } from "@/components/risk/MaxDrawdownGuard";

export default function RiskTools() {
  // Dashboard integration - single hook at page level
  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();
  
  // Card IDs matching the registry
  const quickCalcCardId = 'quick-calculator';
  const positionSizeCardId = 'position-size-calculator';
  const rrCalcCardId = 'rr-calculator';
  const dailyLimitCardId = 'daily-risk-limit';
  const maxDrawdownCardId = 'max-drawdown-guard';
  
  // Check if cards are on dashboard
  const isQuickCalcAdded = isCardOnDashboard(quickCalcCardId);
  const isPositionSizeAdded = isCardOnDashboard(positionSizeCardId);
  const isRRCalcAdded = isCardOnDashboard(rrCalcCardId);
  const isDailyLimitAdded = isCardOnDashboard(dailyLimitCardId);
  const isMaxDrawdownAdded = isCardOnDashboard(maxDrawdownCardId);
  
  const handleAddCard = (cardId: string) => {
    addCard(cardId);
    toast.success('Added to Dashboard');
  };
  
  const handleRemoveCard = (cardId: string) => {
    removeCard(cardId);
    toast.success('Removed from Dashboard');
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Risk Tools" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Quick Risk Calculator */}
          <QuickRiskCalculator
            isAdded={isQuickCalcAdded}
            onAdd={() => handleAddCard(quickCalcCardId)}
            onRemove={() => handleRemoveCard(quickCalcCardId)}
          />

          {/* Position Size Calculator */}
          <PositionSizeCalculator
            isAdded={isPositionSizeAdded}
            onAdd={() => handleAddCard(positionSizeCardId)}
            onRemove={() => handleRemoveCard(positionSizeCardId)}
          />

          {/* Risk-to-Reward Calculator */}
          <RiskRewardCalculator
            isAdded={isRRCalcAdded}
            onAdd={() => handleAddCard(rrCalcCardId)}
            onRemove={() => handleRemoveCard(rrCalcCardId)}
          />

          {/* Daily Risk Limit Tracker */}
          <DailyRiskLimitTracker
            isAdded={isDailyLimitAdded}
            onAdd={() => handleAddCard(dailyLimitCardId)}
            onRemove={() => handleRemoveCard(dailyLimitCardId)}
          />

          {/* Max Drawdown Guard */}
          <MaxDrawdownGuard
            isAdded={isMaxDrawdownAdded}
            onAdd={() => handleAddCard(maxDrawdownCardId)}
            onRemove={() => handleRemoveCard(maxDrawdownCardId)}
          />
        </div>
      </div>
    </div>
  );
}
