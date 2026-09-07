import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAccountCombineMode } from "@/hooks/use-active-trading-account";

export function CombineAccountsToggle() {
  const [combineMode, setCombineMode] = useAccountCombineMode();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="combine-accounts-toggle" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
        Combine accounts
      </Label>
      <Switch
        id="combine-accounts-toggle"
        checked={combineMode}
        onCheckedChange={setCombineMode}
      />
    </div>
  );
}
