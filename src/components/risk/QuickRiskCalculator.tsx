import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, TrendingUp, LinkIcon, RefreshCw, Info } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { useLinkedAccount } from "@/hooks/use-linked-account";
import { AccountLinkingModal } from "@/components/account/AccountLinkingModal";
import { 
  getFXInstruments, 
  getFuturesInstruments, 
  getInstrumentBySymbol,
  calculatePositionSize,
  type TradingInstrument 
} from "@/data/tradingInstruments";
import { cn } from "@/lib/utils";

interface QuickRiskCalculatorProps {
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

const RISK_PRESETS = [0.5, 1, 1.5, 2];
const RISK_STORAGE_KEY = 'globalRiskPreset';

export function QuickRiskCalculator({ isAdded, onAdd, onRemove, compact = false }: QuickRiskCalculatorProps) {
  // Account linking
  const { account, isConnected, balance, currency, refreshBalance, isLoading: isAccountLoading } = useLinkedAccount();
  
  // State
  const [manualBalance, setManualBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [assetCategory, setAssetCategory] = useState<'FX' | 'Futures'>('FX');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('EURUSD');
  const [stopDistance, setStopDistance] = useState<number>(30);
  const [showLinkingModal, setShowLinkingModal] = useState(false);

  // Mode indicator - always Manual for now (Linked when account connected)
  const mode = isConnected ? 'Linked' : 'Manual';

  // Get instruments based on category
  const instruments = useMemo(() => {
    return assetCategory === 'FX' ? getFXInstruments() : getFuturesInstruments();
  }, [assetCategory]);

  // Current instrument
  const currentInstrument = useMemo(() => {
    return getInstrumentBySymbol(selectedInstrument);
  }, [selectedInstrument]);

  // Effective balance (linked or manual)
  const effectiveBalance = isConnected && balance !== null ? balance : manualBalance;

  // Load saved risk preset
  useEffect(() => {
    const saved = localStorage.getItem(RISK_STORAGE_KEY);
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && RISK_PRESETS.includes(val)) {
        setRiskPercent(val);
      }
    }
  }, []);

  // Update instrument when category changes
  useEffect(() => {
    const availableInstruments = assetCategory === 'FX' ? getFXInstruments() : getFuturesInstruments();
    if (availableInstruments.length > 0 && !availableInstruments.find(i => i.symbol === selectedInstrument)) {
      setSelectedInstrument(availableInstruments[0].symbol);
      // Reset stop distance to sensible default
      setStopDistance(assetCategory === 'FX' ? 30 : 10);
    }
  }, [assetCategory, selectedInstrument]);

  // Save risk preset
  const handleRiskPresetChange = (value: number) => {
    setRiskPercent(value);
    localStorage.setItem(RISK_STORAGE_KEY, value.toString());
  };

  // Calculate results
  const results = useMemo(() => {
    if (!currentInstrument || stopDistance <= 0) {
      return {
        riskAmount: 0,
        positionSize: 0,
        formattedSize: '0.00 lots',
      };
    }

    return calculatePositionSize(
      effectiveBalance,
      riskPercent,
      stopDistance,
      currentInstrument
    );
  }, [effectiveBalance, riskPercent, stopDistance, currentInstrument]);

  // Compact dashboard view
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
              <p className="text-sm font-medium">
                {currency === 'GBP' ? '£' : '$'}{effectiveBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Risk</Label>
              <p className="text-sm font-medium">{riskPercent}%</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Position Size</span>
              <span className="text-lg font-bold text-primary">{results.formattedSize}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">Risk Amount</span>
              <span className="text-sm font-medium text-destructive">
                {currency === 'GBP' ? '£' : '$'}{results.riskAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Quick Risk Calculator</CardTitle>
            <Badge variant="secondary" className="text-xs font-normal gap-1">
              Mode: {mode}
            </Badge>
          </div>
          {onAdd && onRemove && (
            <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-5">
            {/* Account Balance Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Account Balance</Label>
                {isConnected && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <LinkIcon className="h-3 w-3" />
                    Linked
                  </Badge>
                )}
              </div>

              {isConnected && balance !== null ? (
                // Connected account display
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {currency === 'GBP' ? '£' : '$'}{balance.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {account?.broker} • Updated {account?.lastUpdated.toLocaleTimeString()}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={refreshBalance}
                      disabled={isAccountLoading}
                      className="h-8 w-8"
                    >
                      <RefreshCw className={cn("h-4 w-4", isAccountLoading && "animate-spin")} />
                    </Button>
                  </div>
                </div>
              ) : (
                // Manual mode with improved callout
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Manual mode</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter your balance below. When account linking is available, this will auto-sync.
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-primary hover:text-primary/80 shrink-0 h-auto py-1 px-2"
                        onClick={() => setShowLinkingModal(true)}
                      >
                        Learn more
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="manual-balance" className="text-xs text-muted-foreground">
                      Manual Balance (£)
                    </Label>
                    <Input
                      id="manual-balance"
                      type="number"
                      value={manualBalance}
                      onChange={(e) => setManualBalance(parseFloat(e.target.value) || 0)}
                      className="h-9 mt-1"
                      placeholder="10000"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Global Risk Preset */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Risk Preset (%)</Label>
              <div className="grid grid-cols-4 gap-2">
                {RISK_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleRiskPresetChange(preset)}
                    className={cn(
                      "py-2 px-3 text-sm font-medium rounded-md border transition-all",
                      riskPercent === preset
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/50 border-border hover:bg-muted hover:border-muted-foreground/20"
                    )}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Saved globally and used across all risk calculations
              </p>
            </div>

            {/* Asset Category Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Asset Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAssetCategory('FX')}
                  className={cn(
                    "py-2 px-4 text-sm font-medium rounded-md border transition-all",
                    assetCategory === 'FX'
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:bg-muted"
                  )}
                >
                  FX / Commodities
                </button>
                <button
                  onClick={() => setAssetCategory('Futures')}
                  className={cn(
                    "py-2 px-4 text-sm font-medium rounded-md border transition-all",
                    assetCategory === 'Futures'
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:bg-muted"
                  )}
                >
                  Futures
                </button>
              </div>
            </div>

            {/* Instrument Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Instrument</Label>
              <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {instruments.map((inst) => (
                    <SelectItem key={inst.symbol} value={inst.symbol}>
                      <span className="font-medium">{inst.symbol}</span>
                      <span className="text-muted-foreground ml-2">— {inst.displayName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentInstrument && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    {currentInstrument.type === 'Futures' ? 'Tick' : 'Pip'} value: £{currentInstrument.pipValue.toFixed(2)}
                  </span>
                  <span>
                    {currentInstrument.type === 'Futures' ? 'Per contract' : 'Per standard lot'}
                  </span>
                </div>
              )}
            </div>

            {/* Stop Distance */}
            <div className="space-y-2">
              <Label htmlFor="stop-distance" className="text-sm font-medium">
                Stop Distance ({currentInstrument?.unitLabel || 'pips'})
              </Label>
              <Input
                id="stop-distance"
                type="number"
                value={stopDistance}
                onChange={(e) => setStopDistance(parseFloat(e.target.value) || 0)}
                className="h-10"
                min={0}
                step={currentInstrument?.type === 'Futures' ? 1 : 0.1}
              />
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-4">
            <div className="p-6 bg-muted/50 rounded-xl border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-5">Calculation Results</h3>
              
              <div className="space-y-5">
                {/* Account Balance Display */}
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">Account Balance</span>
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {currency === 'GBP' ? '£' : '$'}{effectiveBalance.toLocaleString()}
                  </span>
                </div>

                {/* Risk % */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Risk %</span>
                  <Badge variant="secondary" className="text-sm font-medium">
                    {riskPercent}%
                  </Badge>
                </div>

                {/* Risk Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">£ Risked</span>
                  <span className="text-xl font-bold text-destructive">
                    {currency === 'GBP' ? '£' : '$'}{results.riskAmount.toFixed(2)}
                  </span>
                </div>

                {/* Position Size - Highlighted */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {currentInstrument?.type === 'Futures' ? 'Contracts' : 'Position Size'}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {results.formattedSize}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="p-4 bg-muted/30 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Note:</span> Calculations update instantly as you adjust inputs. 
                Always verify position sizes with your broker before placing trades.
              </p>
            </div>

            {/* Instrument Metadata */}
            {currentInstrument && (
              <div className="p-4 bg-muted/30 border border-border rounded-lg">
                <h4 className="text-xs font-medium text-muted-foreground mb-3">Instrument Details</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Symbol</span>
                    <p className="font-medium text-foreground">{currentInstrument.symbol}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="font-medium text-foreground">{currentInstrument.type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{currentInstrument.type === 'Futures' ? 'Tick Value' : 'Pip Value'}</span>
                    <p className="font-medium text-foreground">£{currentInstrument.pipValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{currentInstrument.type === 'Futures' ? 'Tick Size' : 'Pip Size'}</span>
                    <p className="font-medium text-foreground">{currentInstrument.pipSize}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Account Linking Modal */}
    <AccountLinkingModal 
      open={showLinkingModal} 
      onOpenChange={setShowLinkingModal} 
    />
    </>
  );
}
