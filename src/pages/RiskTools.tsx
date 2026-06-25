import { AppHeader } from "@/components/AppHeader";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { toast } from "sonner";
import { QuickRiskCalculator } from "@/components/risk/QuickRiskCalculator";
import { PositionSizeCalculator } from "@/components/risk/PositionSizeCalculator";
import { RiskRewardCalculator } from "@/components/risk/RiskRewardCalculator";
import { DailyRiskLimitTracker } from "@/components/risk/DailyRiskLimitTracker";
import { MaxDrawdownGuard } from "@/components/risk/MaxDrawdownGuard";
import { DynamicRiskAdvisor } from "@/components/risk/DynamicRiskAdvisor";

export default function RiskTools() {
  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();

  const quickCalcCardId = "quick-calculator";
  const positionSizeCardId = "position-size-calculator";
  const rrCalcCardId = "rr-calculator";
  const dailyLimitCardId = "daily-risk-limit";
  const maxDrawdownCardId = "max-drawdown-guard";
  const dynamicAdvisorCardId = "dynamic-risk-advisor";

  const isQuickCalcAdded = isCardOnDashboard(quickCalcCardId);
  const isPositionSizeAdded = isCardOnDashboard(positionSizeCardId);
  const isRRCalcAdded = isCardOnDashboard(rrCalcCardId);
  const isDailyLimitAdded = isCardOnDashboard(dailyLimitCardId);
  const isMaxDrawdownAdded = isCardOnDashboard(maxDrawdownCardId);
  const isDynamicAdvisorAdded = isCardOnDashboard(dynamicAdvisorCardId);

  const handleAddCard = (cardId: string) => {
    addCard(cardId);
    toast.success("Added to Dashboard");
  };

  const handleRemoveCard = (cardId: string) => {
    removeCard(cardId);
    toast.success("Removed from Dashboard");
  };

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Risk Tools" />

      <div className="max-w-7xl mx-auto space-y-6">
        <QuickRiskCalculator
          isAdded={isQuickCalcAdded}
          onAdd={() => handleAddCard(quickCalcCardId)}
          onRemove={() => handleRemoveCard(quickCalcCardId)}
        />

        <PositionSizeCalculator
          isAdded={isPositionSizeAdded}
          onAdd={() => handleAddCard(positionSizeCardId)}
          onRemove={() => handleRemoveCard(positionSizeCardId)}
        />

        <RiskRewardCalculator
          isAdded={isRRCalcAdded}
          onAdd={() => handleAddCard(rrCalcCardId)}
          onRemove={() => handleRemoveCard(rrCalcCardId)}
        />

        <DailyRiskLimitTracker
          isAdded={isDailyLimitAdded}
          onAdd={() => handleAddCard(dailyLimitCardId)}
          onRemove={() => handleRemoveCard(dailyLimitCardId)}
        />

        <MaxDrawdownGuard
          isAdded={isMaxDrawdownAdded}
          onAdd={() => handleAddCard(maxDrawdownCardId)}
          onRemove={() => handleRemoveCard(maxDrawdownCardId)}
        />

        <DynamicRiskAdvisor
          isAdded={isDynamicAdvisorAdded}
          onAdd={() => handleAddCard(dynamicAdvisorCardId)}
          onRemove={() => handleRemoveCard(dynamicAdvisorCardId)}
        />
      </div>
    </div>
  );
}
