import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, TrendingUp } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { cn } from "@/lib/utils";

interface QuickRiskCalculatorProps {
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
  'XAUUSD': 1, // $1 per 0.01 move per 0.01 lot (simplified)
  'NAS100': 1,
  'US30': 1,
  'BTCUSD': 1,
};

const instruments = [
  { value: 'EURUSD', label: 'EUR/USD', pipSize: 0.0001 },
  { value: 'GBPUSD', label: 'GBP/USD', pipSize: 0.0001 },
  { value: 'USDJPY', label: 'USD/JPY', pipSize: 0.01 },
  { value: 'XAUUSD', label: 'Gold (XAU/USD)', pipSize: 0.01 },
  { value: 'NAS100', label: 'NAS100', pipSize: 1 },
  { value: 'US30', label: 'US30', pipSize: 1 },
  { value: 'BTCUSD', label: 'BTC/USD', pipSize: 1 },
];

const defaultRiskPresets = [0.5, 1, 1.5, 2];

export function QuickRiskCalculator({ isAdded, onAdd, onRemove, compact = false }: QuickRiskCalculatorProps) {
  // State for inputs
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [instrument, setInstrument] = useState<string>('EURUSD');
  const [stopPips, setStopPips] = useState<number>(30);
  const [defaultRisk, setDefaultRisk] = useState<number>(1);

  // Load saved default risk
  useEffect(() => {
    const saved = localStorage.getItem('defaultRiskPercent');
    if (saved) {
      const val = parseFloat(saved);
      setDefaultRisk(val);
      setRiskPercent(val);
    }
  }, []);

  // Save default risk when changed
  const handleDefaultRiskChange = (value: number) => {
    setDefaultRisk(value);
    setRiskPercent(value);
    localStorage.setItem('defaultRiskPercent', value.toString());
  };

  // Calculate results
  const results = useMemo(() => {
    const riskAmount = (accountBalance * riskPercent) / 100;
    const pipValue = pipValues[instrument] || 10;
    const lotSize = riskAmount / (stopPips * pipValue);
    
    return {
      riskAmount: riskAmount.toFixed(2),
      lotSize: lotSize.toFixed(2),
    };
  }, [accountBalance, riskPercent, instrument, stopPips]);

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Quick Risk Calculator</CardTitle>
            </div>
            {onAdd && onRemove && (
              <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Balance</Label>
              <p className="text-sm font-medium">${accountBalance.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Risk</Label>
              <p className="text-sm font-medium">{riskPercent}%</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Position Size</span>
              <span className="text-lg font-bold text-primary">{results.lotSize} lots</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">Risk Amount</span>
              <span className="text-sm font-medium text-destructive">${results.riskAmount}</span>
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
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Quick Risk Calculator</CardTitle>
          </div>
          {onAdd && onRemove && (
            <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            {/* Default Risk Presets */}
            <div className="space-y-2">
              <Label className="text-sm">Default Risk %</Label>
              <div className="flex gap-2">
                {defaultRiskPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleDefaultRiskChange(preset)}
                    className={cn(
                      "flex-1 py-1.5 px-2 text-xs font-medium rounded-md border transition-colors",
                      defaultRisk === preset
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-border hover:bg-muted"
                    )}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            {/* Account Balance */}
            <div className="space-y-2">
              <Label htmlFor="account-balance" className="text-sm">Account Balance ($)</Label>
              <Input
                id="account-balance"
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Enter manually or auto-read from connected broker
              </p>
            </div>

            {/* Instrument */}
            <div className="space-y-2">
              <Label className="text-sm">Instrument</Label>
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

            {/* Risk Percentage Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Risk per Trade</Label>
                <Badge variant="outline" className="text-xs">{riskPercent}%</Badge>
              </div>
              <Slider
                value={[riskPercent]}
                onValueChange={(v) => setRiskPercent(v[0])}
                min={0.25}
                max={5}
                step={0.25}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.25%</span>
                <span>5%</span>
              </div>
            </div>

            {/* Stop Size */}
            <div className="space-y-2">
              <Label htmlFor="stop-pips" className="text-sm">Stop Size (pips/points)</Label>
              <Input
                id="stop-pips"
                type="number"
                value={stopPips}
                onChange={(e) => setStopPips(parseFloat(e.target.value) || 0)}
                className="h-9"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="p-5 bg-muted/50 rounded-lg border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Results</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cash Risk</span>
                  </div>
                  <span className="text-xl font-bold text-destructive">${results.riskAmount}</span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Position Size</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">{results.lotSize} lots</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Note:</span> Calculations update instantly. 
                Verify with your broker's lot specifications before trading.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
