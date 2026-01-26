import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";

interface PositionSizeCalculatorProps {
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

// Pip value lookup (approximate values per standard lot)
const pipValues: Record<string, number> = {
  'EURUSD': 10,
  'GBPUSD': 10,
  'USDJPY': 9.09,
  'XAUUSD': 1,
  'NAS100': 1,
  'US30': 1,
};

const instruments = [
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'XAUUSD', label: 'Gold (XAU/USD)' },
  { value: 'NAS100', label: 'NAS100' },
  { value: 'US30', label: 'US30' },
];

export function PositionSizeCalculator({ isAdded, onAdd, onRemove, compact = false }: PositionSizeCalculatorProps) {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [instrument, setInstrument] = useState<string>('EURUSD');
  const [entryPrice, setEntryPrice] = useState<number>(1.0850);
  const [stopLoss, setStopLoss] = useState<number>(1.0820);
  const [takeProfit, setTakeProfit] = useState<number>(1.0910);
  const [leverage, setLeverage] = useState<string>('100');

  const results = useMemo(() => {
    const riskAmount = (accountBalance * riskPercent) / 100;
    const pipValue = pipValues[instrument] || 10;
    
    // Calculate pip distances
    const pipSize = instrument === 'USDJPY' ? 0.01 : instrument.includes('USD') && instrument !== 'XAUUSD' ? 0.0001 : 0.01;
    const stopPips = Math.abs(entryPrice - stopLoss) / pipSize;
    const tpPips = Math.abs(takeProfit - entryPrice) / pipSize;
    
    const lotSize = stopPips > 0 ? riskAmount / (stopPips * pipValue) : 0;
    const rewardAmount = lotSize * tpPips * pipValue;
    const rrRatio = stopPips > 0 ? tpPips / stopPips : 0;

    return {
      riskAmount: riskAmount.toFixed(2),
      rewardAmount: rewardAmount.toFixed(2),
      lotSize: lotSize.toFixed(2),
      stopPips: stopPips.toFixed(1),
      tpPips: tpPips.toFixed(1),
      rrRatio: rrRatio.toFixed(2),
    };
  }, [accountBalance, riskPercent, instrument, entryPrice, stopLoss, takeProfit]);

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Position Size</CardTitle>
            </div>
            {onAdd && onRemove && (
              <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Lot Size</span>
            <span className="text-lg font-bold text-primary">{results.lotSize}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">R:R</span>
            <span className="text-sm font-medium text-foreground">{results.rrRatio}</span>
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
            <Ruler className="h-5 w-5 text-primary" />
            <CardTitle>Position Size Calculator</CardTitle>
          </div>
          {onAdd && onRemove && (
            <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Currency Pair</Label>
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {instruments.map((inst) => (
                    <SelectItem key={inst.value} value={inst.value}>
                      {inst.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Account Size ($)</Label>
              <Input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Risk % per Trade</Label>
              <Input
                type="number"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                step="0.1"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Entry Price</Label>
              <Input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                step="0.0001"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Stop Loss</Label>
              <Input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                step="0.0001"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Take Profit</Label>
              <Input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                step="0.0001"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Leverage</Label>
              <Select value={leverage} onValueChange={setLeverage}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">1:30</SelectItem>
                  <SelectItem value="50">1:50</SelectItem>
                  <SelectItem value="100">1:100</SelectItem>
                  <SelectItem value="200">1:200</SelectItem>
                  <SelectItem value="500">1:500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-muted/50 rounded-lg border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Results</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Position Size</span>
                  <span className="text-lg font-bold text-foreground">{results.lotSize} lots</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Risk Amount</span>
                  <span className="text-lg font-bold text-destructive">${results.riskAmount}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reward Amount</span>
                  <span className="text-lg font-bold text-success">${results.rewardAmount}</span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Reward:Risk Ratio</span>
                  <span className="text-xl font-bold text-primary">{results.rrRatio}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Stop Loss (pips)</span>
                  <span className="text-sm font-medium text-foreground">{results.stopPips}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Take Profit (pips)</span>
                  <span className="text-sm font-medium text-foreground">{results.tpPips}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium text-sm text-foreground mb-1">Conservative</h3>
                <p className="text-xl font-bold text-foreground mb-1">0.5-1%</p>
                <p className="text-xs text-muted-foreground">Risk per trade for capital preservation</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium text-sm text-foreground mb-1">Moderate</h3>
                <p className="text-xl font-bold text-foreground mb-1">1-2%</p>
                <p className="text-xs text-muted-foreground">Balanced risk for steady growth</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium text-sm text-foreground mb-1">Aggressive</h3>
                <p className="text-xl font-bold text-foreground mb-1">2-3%</p>
                <p className="text-xs text-muted-foreground">Higher risk for faster returns</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
