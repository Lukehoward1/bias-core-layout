import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { cn } from "@/lib/utils";

interface DailyRiskLimitTrackerProps {
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

export function DailyRiskLimitTracker({ isAdded, onAdd, onRemove, compact = false }: DailyRiskLimitTrackerProps) {
  const [limitType, setLimitType] = useState<'percent' | 'cash'>('percent');
  const [dailyLimit, setDailyLimit] = useState<number>(5);
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [lossToday, setLossToday] = useState<number>(150);

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem('dailyRiskLimit');
    if (saved) {
      const data = JSON.parse(saved);
      setLimitType(data.type || 'percent');
      setDailyLimit(data.limit || 5);
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('dailyRiskLimit', JSON.stringify({ type: limitType, limit: dailyLimit }));
  }, [limitType, dailyLimit]);

  const results = useMemo(() => {
    const limitCash = limitType === 'percent' 
      ? (accountBalance * dailyLimit) / 100 
      : dailyLimit;
    
    const remaining = limitCash - lossToday;
    const percentUsed = limitCash > 0 ? (lossToday / limitCash) * 100 : 0;
    
    return {
      limitCash: limitCash.toFixed(2),
      remaining: remaining.toFixed(2),
      percentUsed: Math.min(percentUsed, 100).toFixed(1),
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
            {onAdd && onRemove && (
              <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Used: {results.percentUsed}%</span>
              <span className={cn(
                "font-medium",
                results.isAtLimit ? "text-destructive" : results.isNearLimit ? "text-warning" : "text-success"
              )}>
                ${results.remaining} left
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
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Daily Risk Limit Tracker</CardTitle>
          </div>
          {onAdd && onRemove && (
            <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />
          )}
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
                onValueChange={(v) => setLimitType(v as 'percent' | 'cash')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percent" id="percent" />
                  <Label htmlFor="percent" className="cursor-pointer">Percentage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="cursor-pointer">Cash Amount</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Daily Limit */}
            <div className="space-y-2">
              <Label className="text-sm">
                Daily Loss Limit {limitType === 'percent' ? '(%)' : '($)'}
              </Label>
              <Input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseFloat(e.target.value) || 0)}
                step={limitType === 'percent' ? 0.5 : 50}
                className="h-9"
              />
            </div>

            {/* Account Balance */}
            <div className="space-y-2">
              <Label className="text-sm">Account Balance ($)</Label>
              <Input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                className="h-9"
              />
            </div>

            {/* Today's Loss */}
            <div className="space-y-2">
              <Label className="text-sm">Today's Loss ($)</Label>
              <Input
                type="number"
                value={lossToday}
                onChange={(e) => setLossToday(parseFloat(e.target.value) || 0)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Enter your realized losses for today
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
                    <p className="text-lg font-bold text-foreground">${results.limitCash}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className={cn(
                      "text-lg font-bold",
                      parseFloat(results.remaining) <= 0 ? "text-destructive" : "text-success"
                    )}>
                      ${results.remaining}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            {results.isNearLimit && (
              <div className={cn(
                "p-4 rounded-lg border flex items-start gap-3",
                results.isAtLimit 
                  ? "bg-destructive/10 border-destructive/20" 
                  : "bg-warning/10 border-warning/20"
              )}>
                <AlertTriangle className={cn(
                  "h-5 w-5 mt-0.5",
                  results.isAtLimit ? "text-destructive" : "text-warning"
                )} />
                <div>
                  <p className="font-medium text-sm">
                    {results.isAtLimit ? "Daily Limit Reached" : "Approaching Daily Limit"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {results.isAtLimit 
                      ? "You've reached your daily loss limit. Consider stopping trading for today."
                      : "You're close to your daily loss limit. Trade cautiously."
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Note:</span> This is for tracking only. 
                No trades will be blocked automatically.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
