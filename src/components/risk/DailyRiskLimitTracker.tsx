import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import { cn } from "@/lib/utils";

interface DailyRiskLimitTrackerProps {
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

export function DailyRiskLimitTracker({ isAdded, onAdd, onRemove, compact = false }: DailyRiskLimitTrackerProps) {
  // ── Account awareness ────────────────────────────────────────────────────
  const { primaryAccount, accounts, isLoading: isAccountLoading } = useLinkedAccounts();
  const accountIds = useMemo(() => accounts.map((a) => a.id), [accounts]);
  const { trades } = useJournalTrades(accountIds);

  const activeAccount = primaryAccount;
  const currency = activeAccount?.currency ?? "GBP";
  const currencySymbol = currency === "GBP" ? "£" : "$";
  const isLinked = activeAccount?.isConnected ?? false;
  const mode = isLinked ? "Linked" : "Manual";

  const [limitType, setLimitType] = useState<"percent" | "cash">("percent");

  const [dailyLimitInput, setDailyLimitInput] = useState<string>("5");
  const [accountBalanceInput, setAccountBalanceInput] = useState<string>("10000");
  const [lossTodayInput, setLossTodayInput] = useState<string>("0");

  // Populate balance from account once on first load; user edits are sticky after that
  const balanceInitRef = useRef(false);
  useEffect(() => {
    if (!balanceInitRef.current && activeAccount && !isAccountLoading) {
      setAccountBalanceInput(activeAccount.balance.toString());
      balanceInitRef.current = true;
    }
  }, [activeAccount, isAccountLoading]);

  // Refresh today's loss once trades are loaded (covers synced/broker trades not in localStorage)
  const lossInitRef = useRef(false);
  useEffect(() => {
    if (lossInitRef.current || isAccountLoading) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const total = trades
      .filter((t) => t.date === todayStr && (t.pnl || 0) < 0)
      .reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);
    setLossTodayInput(total.toFixed(2));
    lossInitRef.current = true;
  }, [trades, isAccountLoading]);

  // Numeric values for calculations (blank => 0)
  const dailyLimit = useMemo(() => toNumberOrZero(dailyLimitInput), [dailyLimitInput]);
  const accountBalance = useMemo(() => toNumberOrZero(accountBalanceInput), [accountBalanceInput]);
  const lossToday = useMemo(() => toNumberOrZero(lossTodayInput), [lossTodayInput]);

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem("dailyRiskLimit");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setLimitType(data.type === "cash" ? "cash" : "percent");
        const n = Number(data.limit);
        setDailyLimitInput(Number.isFinite(n) ? String(n) : "5");
      } catch {
        // ignore bad storage
      }
    }
  }, []);

  // Save settings (store numeric)
  useEffect(() => {
    localStorage.setItem("dailyRiskLimit", JSON.stringify({ type: limitType, limit: dailyLimit }));
  }, [limitType, dailyLimit]);

  const results = useMemo(() => {
    const limitCash = limitType === "percent" ? (accountBalance * dailyLimit) / 100 : dailyLimit;

    const remaining = limitCash - lossToday;
    const percentUsed = limitCash > 0 ? (lossToday / limitCash) * 100 : 0;

    return {
      limitCash: (Number.isFinite(limitCash) ? limitCash : 0).toFixed(2),
      remaining: (Number.isFinite(remaining) ? remaining : 0).toFixed(2),
      percentUsed: Math.min(Number.isFinite(percentUsed) ? percentUsed : 0, 100).toFixed(1),
      isNearLimit: percentUsed >= 80,
      isAtLimit: percentUsed >= 100,
    };
  }, [limitType, dailyLimit, accountBalance, lossToday]);

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
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Daily Risk Limit</CardTitle>
            </div>
            {onAdd && onRemove && <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Used: {results.percentUsed}%</span>
              <span
                className={cn(
                  "font-medium",
                  results.isAtLimit ? "text-destructive" : results.isNearLimit ? "text-warning" : "text-success",
                )}
              >
                {currencySymbol}{results.remaining} left
              </span>
            </div>
            <Progress value={parseFloat(results.percentUsed)} className="h-2" />
          </div>
          {results.isNearLimit && (
            <div className="flex items-center gap-1 text-xs text-warning">
              <AlertTriangle className="h-3 w-3" />
              <span>Approaching daily limit</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Daily Risk Limit Tracker</CardTitle>
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
                  <RadioGroupItem value="percent" id="percent" />
                  <Label htmlFor="percent" className="cursor-pointer">
                    Percentage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="cursor-pointer">
                    Cash Amount
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Daily Limit */}
            <div className="space-y-2">
              <Label className="text-sm">
                Daily Loss Limit {limitType === "percent" ? "(%)" : `(${currencySymbol})`}
              </Label>
              <Input
                type="number"
                value={dailyLimitInput}
                onChange={(e) => setDailyLimitInput(e.target.value)}
                step={limitType === "percent" ? 0.5 : 50}
                className="h-9"
                placeholder={limitType === "percent" ? "5" : "500"}
                min={0}
              />
            </div>

            {/* Account Balance */}
            <div className="space-y-2">
              <Label className="text-sm">Account Balance ({currencySymbol})</Label>
              <Input
                type="number"
                value={accountBalanceInput}
                onChange={(e) => setAccountBalanceInput(e.target.value)}
                className="h-9"
                placeholder="10000"
                min={0}
              />
            </div>

            {/* Today's Loss */}
            <div className="space-y-2">
              <Label className="text-sm">Today's Loss ({currencySymbol})</Label>
              <Input
                type="number"
                value={lossTodayInput}
                onChange={(e) => setLossTodayInput(e.target.value)}
                className="h-9"
                placeholder="0"
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled from today's closed trades — edit to override
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Visual Progress */}
            <div className="p-5 bg-muted/50 rounded-lg border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Daily Limit Status</h3>

              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">{results.percentUsed}%</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all", getStatusColor())}
                      style={{ width: `${Math.min(parseFloat(results.percentUsed), 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Limit</p>
                    <p className="text-lg font-bold text-foreground">
                      {currencySymbol}{results.limitCash}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        parseFloat(results.remaining) <= 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {currencySymbol}{results.remaining}
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
                    {results.isAtLimit ? "Daily Limit Reached" : "Approaching Daily Limit"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {results.isAtLimit
                      ? "You've reached your daily loss limit. Consider stopping trading for today."
                      : "You're close to your daily loss limit. Trade cautiously."}
                  </p>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Note:</span> This is for tracking only. No trades will be blocked
                automatically.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
