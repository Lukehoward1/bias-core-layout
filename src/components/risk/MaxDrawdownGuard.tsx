import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, AlertTriangle, TrendingDown, Lock } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { cn } from "@/lib/utils";

interface MaxDrawdownGuardProps {
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

/**
 * Allow empty numeric inputs (show blank, treat as 0 for calculations)
 */
const parseNumberOrNull = (raw: string): number | null => {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const toNumber = (n: number | null, fallback = 0) => (n === null ? fallback : n);

export function MaxDrawdownGuard({ isAdded, onAdd, onRemove, compact = false }: MaxDrawdownGuardProps) {
  // ── Account awareness ────────────────────────────────────────────────────
  const { primaryAccount, isLoading: isAccountLoading } = useLinkedAccounts();
  const activeAccount = primaryAccount;
  const currency = activeAccount?.currency ?? "GBP";
  const currencySymbol = currency === "GBP" ? "£" : "$";
  const isLinked = activeAccount?.isConnected ?? false;
  const mode = isLinked ? "Linked" : "Manual";

  const [limitType, setLimitType] = useState<"percent" | "cash">("percent");

  const [maxDrawdown, setMaxDrawdown] = useState<number | null>(10);
  const [startingBalance, setStartingBalance] = useState<number | null>(10000);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  // Populate both balances from account once on first load; user edits are sticky after that.
  // Starting balance defaults to the account's current balance (user adjusts to their period start).
  const balancesInitRef = useRef(false);
  useEffect(() => {
    if (!balancesInitRef.current && activeAccount && !isAccountLoading) {
      setCurrentBalance(activeAccount.balance);
      setStartingBalance(activeAccount.balance);
      balancesInitRef.current = true;
    }
  }, [activeAccount, isAccountLoading]);

  // Load saved drawdown setting
  useEffect(() => {
    const saved = localStorage.getItem("maxDrawdownSettings");
    if (saved) {
      const data = JSON.parse(saved);
      setLimitType(data.type || "percent");
      const savedLimit = typeof data.limit === "number" && Number.isFinite(data.limit) ? data.limit : undefined;
      setMaxDrawdown(savedLimit ?? 10);
    }
  }, []);

  // Save drawdown setting
  useEffect(() => {
    localStorage.setItem("maxDrawdownSettings", JSON.stringify({ type: limitType, limit: toNumber(maxDrawdown, 0) }));
  }, [limitType, maxDrawdown]);

  const results = useMemo(() => {
    const sBal = toNumber(startingBalance, 0);
    const cBal = isLinked && activeAccount ? activeAccount.balance : toNumber(currentBalance, 0);
    const limitVal = toNumber(maxDrawdown, 0);

    const drawdownCash = sBal - cBal;
    const drawdownPercent = sBal > 0 ? (drawdownCash / sBal) * 100 : 0;

    const limitCash = limitType === "percent" ? (sBal * limitVal) / 100 : limitVal;
    const limitPercent = limitType === "percent" ? limitVal : sBal > 0 ? (limitVal / sBal) * 100 : 0;

    const remainingCash = limitCash - drawdownCash;
    const percentOfLimit = limitCash > 0 ? (drawdownCash / limitCash) * 100 : 0;

    return {
      drawdownCash: drawdownCash.toFixed(2),
      drawdownPercent: drawdownPercent.toFixed(2),
      limitCash: limitCash.toFixed(2),
      limitPercent: limitPercent.toFixed(1),
      remainingCash: remainingCash.toFixed(2),
      percentOfLimit: Math.min(percentOfLimit, 100).toFixed(1),
      isNearLimit: percentOfLimit >= 70,
      isAtLimit: percentOfLimit >= 100,
    };
  }, [limitType, maxDrawdown, startingBalance, currentBalance, isLinked, activeAccount]);

  const getStatusColor = () => {
    if (results.isAtLimit) return "bg-destructive";
    if (results.isNearLimit) return "bg-warning";
    return "bg-primary";
  };

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            </div>
            {onAdd && onRemove && <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Current DD</span>
            <span
              className={cn(
                "text-lg font-bold",
                results.isAtLimit ? "text-destructive" : results.isNearLimit ? "text-warning" : "text-foreground",
              )}
            >
              {results.drawdownPercent}%
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Limit: {results.limitPercent}%</span>
              <span>{currencySymbol}{results.remainingCash} left</span>
            </div>
            <Progress value={parseFloat(results.percentOfLimit)} className="h-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Max Drawdown Guard</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal">
              Mode: {mode}
            </Badge>
          </div>
          {onAdd && onRemove && <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-5">
            {/* Limit Type */}
            <div className="space-y-2">
              <Label className="text-sm">Limit Type</Label>
              <RadioGroup
                value={limitType}
                onValueChange={(v) => setLimitType(v as "percent" | "cash")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percent" id="dd-percent" />
                  <Label htmlFor="dd-percent" className="cursor-pointer">
                    Percentage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="dd-cash" />
                  <Label htmlFor="dd-cash" className="cursor-pointer">
                    Cash Amount
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Max Drawdown */}
            <div className="space-y-2">
              <Label className="text-sm">
                Max Drawdown {limitType === "percent" ? "(%)" : `(${currencySymbol})`}
              </Label>
              <Input
                type="number"
                value={maxDrawdown ?? ""}
                onChange={(e) => setMaxDrawdown(parseNumberOrNull(e.target.value))}
                step={limitType === "percent" ? 1 : 100}
                className="h-9"
                placeholder={limitType === "percent" ? "10" : "1000"}
              />
            </div>

            {/* Starting Balance */}
            <div className="space-y-2">
              <Label className="text-sm">Starting Balance ({currencySymbol})</Label>
              <Input
                type="number"
                value={startingBalance ?? ""}
                onChange={(e) => setStartingBalance(parseNumberOrNull(e.target.value))}
                className="h-9"
                placeholder="10000"
              />
              <p className="text-xs text-muted-foreground">
                Your account balance at the start of the period
              </p>
            </div>

            {/* Current Balance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Current Balance ({currencySymbol})</Label>
                {isLinked && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Lock className="h-3 w-3" />
                    Linked
                  </Badge>
                )}
              </div>
              {isLinked && activeAccount ? (
                <div className="h-9 px-3 rounded-md border border-border bg-muted/50 flex items-center text-sm text-muted-foreground select-none cursor-not-allowed">
                  {currencySymbol}{activeAccount.balance.toLocaleString()}
                </div>
              ) : (
                <Input
                  type="number"
                  value={currentBalance ?? ""}
                  onChange={(e) => setCurrentBalance(parseNumberOrNull(e.target.value))}
                  className="h-9"
                  placeholder="10000"
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Current Drawdown Display */}
            <div className="p-5 bg-muted/50 rounded-lg border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Drawdown Status</h3>

              <div className="space-y-4">
                {/* Current Drawdown */}
                <div className="text-center pb-4 border-b border-border">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingDown
                      className={cn(
                        "h-5 w-5",
                        results.isAtLimit
                          ? "text-destructive"
                          : results.isNearLimit
                            ? "text-warning"
                            : "text-muted-foreground",
                      )}
                    />
                    <span className="text-sm text-muted-foreground">Current Drawdown</span>
                  </div>
                  <p
                    className={cn(
                      "text-3xl font-bold",
                      results.isAtLimit ? "text-destructive" : results.isNearLimit ? "text-warning" : "text-foreground",
                    )}
                  >
                    {results.drawdownPercent}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currencySymbol}{results.drawdownCash} loss
                  </p>
                </div>

                {/* Progress to Limit */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress to Limit</span>
                    <span className="font-medium">{results.percentOfLimit}%</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all", getStatusColor())}
                      style={{ width: `${Math.min(parseFloat(results.percentOfLimit), 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Max Limit</p>
                    <p className="text-lg font-bold text-foreground">
                      {currencySymbol}{results.limitCash}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        parseFloat(results.remainingCash) <= 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {currencySymbol}{results.remainingCash}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            {results.isNearLimit && (
              <div
                className={cn(
                  "p-4 rounded-lg border flex items-start gap-3",
                  results.isAtLimit ? "bg-destructive/10 border-destructive/20" : "bg-warning/10 border-warning/20",
                )}
              >
                <AlertTriangle
                  className={cn("h-5 w-5 mt-0.5", results.isAtLimit ? "text-destructive" : "text-warning")}
                />
                <div>
                  <p className="font-medium text-sm">
                    {results.isAtLimit ? "Max Drawdown Reached" : "Approaching Max Drawdown"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {results.isAtLimit
                      ? "You've reached your maximum drawdown limit."
                      : "You're approaching your maximum drawdown limit."}
                  </p>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Note:</span> This is visual guidance only. No account restrictions are
                enforced.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
