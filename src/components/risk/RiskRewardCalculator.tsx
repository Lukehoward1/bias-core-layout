import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Scale, ArrowDown, ArrowUp } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { cn } from "@/lib/utils";

interface RiskRewardCalculatorProps {
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

/** Allow empty inputs visually, but treat empty as 0 for maths */
const toNumberOrZero = (v: string) => {
  if (v.trim() === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function RiskRewardCalculator({ isAdded, onAdd, onRemove, compact = false }: RiskRewardCalculatorProps) {
  // ✅ Keep slider values as numbers (sliders can’t be empty)
  const [stopDistance, setStopDistance] = useState<number>(30);
  const [targetDistance, setTargetDistance] = useState<number>(60);
  const [riskPercent, setRiskPercent] = useState<number>(1);

  // ✅ Inputs that should be allowed to go blank
  const [stopDistanceInput, setStopDistanceInput] = useState<string>("30");
  const [targetDistanceInput, setTargetDistanceInput] = useState<string>("60");
  const [accountBalanceInput, setAccountBalanceInput] = useState<string>("10000");

  // Numeric values for calculations (blank => 0)
  const stopDistanceNum = useMemo(() => toNumberOrZero(stopDistanceInput), [stopDistanceInput]);
  const targetDistanceNum = useMemo(() => toNumberOrZero(targetDistanceInput), [targetDistanceInput]);
  const accountBalanceNum = useMemo(() => toNumberOrZero(accountBalanceInput), [accountBalanceInput]);

  const results = useMemo(() => {
    const rrRatio = stopDistanceNum > 0 ? targetDistanceNum / stopDistanceNum : 0;
    const riskAmount = (accountBalanceNum * riskPercent) / 100;
    const rewardAmount = riskAmount * rrRatio;

    return {
      rrRatio: (Number.isFinite(rrRatio) ? rrRatio : 0).toFixed(2),
      riskAmount: (Number.isFinite(riskAmount) ? riskAmount : 0).toFixed(2),
      rewardAmount: (Number.isFinite(rewardAmount) ? rewardAmount : 0).toFixed(2),
    };
  }, [stopDistanceNum, targetDistanceNum, accountBalanceNum, riskPercent]);

  const getRRColor = (ratio: number) => {
    if (ratio >= 2) return "text-success";
    if (ratio >= 1) return "text-warning";
    return "text-destructive";
  };

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Risk:Reward</CardTitle>
            </div>
            {onAdd && onRemove && <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Ratio</span>
            <span className={cn("text-2xl font-bold", getRRColor(parseFloat(results.rrRatio)))}>
              1:{results.rrRatio}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <ArrowDown className="h-3 w-3 text-destructive" />
              <span className="text-muted-foreground">Risk:</span>
              <span className="text-destructive font-medium">£{results.riskAmount}</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3 text-success" />
              <span className="text-muted-foreground">Reward:</span>
              <span className="text-success font-medium">£{results.rewardAmount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <CardTitle>Risk-to-Reward Calculator</CardTitle>
          </div>
          {onAdd && onRemove && <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-5">
            {/* Stop Distance */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Stop Distance (pips)</Label>
                <Badge variant="outline" className="text-xs">
                  {stopDistance}
                </Badge>
              </div>
              <Input
                type="number"
                value={stopDistanceInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setStopDistanceInput(v);

                  // If user typed a valid number, sync slider value
                  const n = toNumberOrZero(v);
                  if (v.trim() !== "" && Number.isFinite(n)) setStopDistance(n);
                }}
                className="h-9"
                placeholder="30"
                min={0}
              />
              <Slider
                value={[stopDistance]}
                onValueChange={(v) => {
                  setStopDistance(v[0]);
                  setStopDistanceInput(String(v[0]));
                }}
                min={5}
                max={200}
                step={5}
                className="py-2"
              />
            </div>

            {/* Target Distance */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Target Distance (pips)</Label>
                <Badge variant="outline" className="text-xs">
                  {targetDistance}
                </Badge>
              </div>
              <Input
                type="number"
                value={targetDistanceInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setTargetDistanceInput(v);

                  const n = toNumberOrZero(v);
                  if (v.trim() !== "" && Number.isFinite(n)) setTargetDistance(n);
                }}
                className="h-9"
                placeholder="60"
                min={0}
              />
              <Slider
                value={[targetDistance]}
                onValueChange={(v) => {
                  setTargetDistance(v[0]);
                  setTargetDistanceInput(String(v[0]));
                }}
                min={5}
                max={400}
                step={5}
                className="py-2"
              />
            </div>

            {/* Account Balance */}
            <div className="space-y-2">
              <Label className="text-sm">Account Balance (£)</Label>
              <Input
                type="number"
                value={accountBalanceInput}
                onChange={(e) => setAccountBalanceInput(e.target.value)}
                className="h-9"
                placeholder="10000"
                min={0}
                step={1}
              />
            </div>

            {/* Risk Percent */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Risk per Trade</Label>
                <Badge variant="outline" className="text-xs">
                  {riskPercent}%
                </Badge>
              </div>
              <Slider
                value={[riskPercent]}
                onValueChange={(v) => setRiskPercent(v[0])}
                min={0.25}
                max={5}
                step={0.25}
                className="py-2"
              />
            </div>
          </div>

          <div className="space-y-4">
            {/* Main Result */}
            <div className="p-6 bg-muted/50 rounded-lg border border-border text-center">
              <p className="text-sm text-muted-foreground mb-2">Risk:Reward Ratio</p>
              <p className={cn("text-4xl font-bold", getRRColor(parseFloat(results.rrRatio)))}>1:{results.rrRatio}</p>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowDown className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Risk</span>
                </div>
                <p className="text-xl font-bold text-destructive">£{results.riskAmount}</p>
              </div>
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowUp className="h-4 w-4 text-success" />
                  <span className="text-xs text-muted-foreground">Reward</span>
                </div>
                <p className="text-xl font-bold text-success">£{results.rewardAmount}</p>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Tip:</span> A minimum 1:2 R:R is recommended. This means you need to win
                only 34% of trades to break even.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
