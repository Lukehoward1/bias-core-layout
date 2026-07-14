import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, TrendingUp, LinkIcon, RefreshCw, ArrowRight } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { useRiskToolMode } from "@/hooks/use-risk-tool-mode";
import { RiskToolModeToggle } from "@/components/risk/RiskToolModeToggle";
import { useMarketQuote } from "@/hooks/use-market-quotes";
import {
  getFXInstruments,
  getFuturesInstruments,
  getInstrumentBySymbol,
  calculatePositionSize,
} from "@/data/tradingInstruments";
import { cn } from "@/lib/utils";
import { useHomeCurrency } from "@/hooks/use-home-currency";
import { currencySymbol } from "@/lib/currency";

interface QuickRiskCalculatorProps {
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

const RISK_PRESETS = [0.5, 1, 1.5, 2];
const RISK_STORAGE_KEY = "globalRiskPreset";

const toNumberOrZero = (v: string) => {
  if (v.trim() === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatPriceNoCommas = (raw: string | number) => {
  const cleaned = (raw ?? "").toString().trim();
  if (!cleaned || cleaned === "—") return "—";

  const noCommas = cleaned.replace(/,/g, "");
  const n = Number(noCommas);
  if (!Number.isFinite(n)) return noCommas;

  const m = noCommas.match(/^\d+(\.(\d+))?$/);
  if (m) {
    const decimals = m[2]?.length ?? 0;
    if (decimals > 0) return n.toFixed(decimals);
  }

  return String(n);
};

export function QuickRiskCalculator({ isAdded, onAdd, onRemove, compact = false }: QuickRiskCalculatorProps) {
  const navigate = useNavigate();

  const { refreshAccount, isLoading: isAccountLoading } = useLinkedAccounts();
  const {
    mode,
    setMode,
    selectedAccount,
    selectedAccountId,
    setSelectedAccountId,
    connectedAccounts,
    isEffectivelyLinked,
    hasMultipleAccounts,
    isLoading,
  } = useRiskToolMode("qrc");

  const { homeCurrency } = useHomeCurrency();
  const sym = currencySymbol(homeCurrency);

  const [manualBalanceInput, setManualBalanceInput] = useState<string>("10000");
  const [stopDistanceInput, setStopDistanceInput] = useState<string>("30");

  const [includeSpread, setIncludeSpread] = useState<boolean>(false);
  const [spreadInput, setSpreadInput] = useState<string>("");

  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [customRiskInput, setCustomRiskInput] = useState<string>("");
  const [isCustomRisk, setIsCustomRisk] = useState<boolean>(false);

  const [assetCategory, setAssetCategory] = useState<"FX" | "Futures">("FX");
  const [selectedInstrument, setSelectedInstrument] = useState<string>("EURUSD");

  const quote = useMarketQuote(selectedInstrument);


  const instruments = useMemo(() => {
    return assetCategory === "FX" ? getFXInstruments() : getFuturesInstruments();
  }, [assetCategory]);

  const currentInstrument = useMemo(() => {
    return getInstrumentBySymbol(selectedInstrument);
  }, [selectedInstrument]);

  const manualBalance = useMemo(() => toNumberOrZero(manualBalanceInput), [manualBalanceInput]);
  const stopDistance = useMemo(() => toNumberOrZero(stopDistanceInput), [stopDistanceInput]);
  const spread = useMemo(() => toNumberOrZero(spreadInput), [spreadInput]);
  const customRisk = useMemo(() => toNumberOrZero(customRiskInput), [customRiskInput]);

  const effectiveBalance = isEffectivelyLinked && selectedAccount ? selectedAccount.balance : manualBalance;
  const effectiveRiskPercent = isCustomRisk ? customRisk : riskPercent;

  useEffect(() => {
    setIncludeSpread(isEffectivelyLinked);
  }, [isEffectivelyLinked]);

  useEffect(() => {
    const saved = localStorage.getItem(RISK_STORAGE_KEY);
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && RISK_PRESETS.includes(val)) {
        setRiskPercent(val);
      }
    }
  }, []);

  useEffect(() => {
    const availableInstruments = assetCategory === "FX" ? getFXInstruments() : getFuturesInstruments();

    if (availableInstruments.length > 0 && !availableInstruments.find((i) => i.symbol === selectedInstrument)) {
      setSelectedInstrument(availableInstruments[0].symbol);
    }

    setStopDistanceInput(assetCategory === "FX" ? "30" : "10");
  }, [assetCategory, selectedInstrument]);

  const handleRiskPresetChange = (value: number) => {
    setIsCustomRisk(false);
    setRiskPercent(value);
    localStorage.setItem(RISK_STORAGE_KEY, value.toString());
  };

  const effectiveStopDistance = useMemo(() => {
    if (!includeSpread) return stopDistance;
    return stopDistance + spread;
  }, [stopDistance, spread, includeSpread]);

  const results = useMemo(() => {
    if (!currentInstrument || effectiveStopDistance <= 0 || effectiveBalance <= 0 || effectiveRiskPercent <= 0) {
      return {
        riskAmount: 0,
        positionSize: 0,
        formattedSize: currentInstrument?.type === "Futures" ? "0 contracts" : "0.00 lots",
      };
    }

    return calculatePositionSize(effectiveBalance, effectiveRiskPercent, effectiveStopDistance, currentInstrument);
  }, [effectiveBalance, effectiveRiskPercent, effectiveStopDistance, currentInstrument]);

  const displayPrice = formatPriceNoCommas(quote?.last?.toString() ?? "—");

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Quick Risk Calculator</CardTitle>
            </div>
            {onAdd && onRemove && <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Balance</Label>
              <p className="text-sm font-medium">
                {sym}{effectiveBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Risk</Label>
              <p className="text-sm font-medium">{effectiveRiskPercent}%</p>
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
                {sym}{results.riskAmount.toFixed(2)}
              </span>
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
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Quick Risk Calculator</CardTitle>
            <RiskToolModeToggle mode={mode} onChange={setMode} />
          </div>
          {onAdd && onRemove && <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Account Balance</Label>

              {isEffectivelyLinked && selectedAccount ? (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-2xl font-bold text-foreground">
                        {sym}{selectedAccount.balance.toLocaleString()}
                      </p>
                      {hasMultipleAccounts ? (
                        <Select value={selectedAccountId ?? ""} onValueChange={setSelectedAccountId}>
                          <SelectTrigger className="h-6 w-auto max-w-[220px] border-none bg-transparent p-0 mt-1 text-xs text-muted-foreground shadow-none focus:ring-0 gap-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {connectedAccounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name} • {a.broker}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {selectedAccount.name} • {selectedAccount.broker}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => refreshAccount(selectedAccount.id)}
                      disabled={isAccountLoading}
                      className="h-8 w-8 shrink-0"
                    >
                      <RefreshCw className={cn("h-4 w-4", isAccountLoading && "animate-spin")} />
                    </Button>
                  </div>
                </div>
              ) : mode === "linked" && !isLoading ? (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <LinkIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">No account linked</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Broker connections are coming soon.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Input
                  id="manual-balance"
                  type="number"
                  value={manualBalanceInput}
                  onChange={(e) => setManualBalanceInput(e.target.value)}
                  className="h-9"
                  placeholder="10000"
                  min={0}
                  step={1}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Risk Preset (%)</Label>
              <div className="grid grid-cols-4 gap-2">
                {RISK_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleRiskPresetChange(preset)}
                    className={cn(
                      "py-2 px-3 text-sm font-medium rounded-md border transition-all",
                      !isCustomRisk && riskPercent === preset
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/50 border-border hover:bg-muted hover:border-muted-foreground/20",
                    )}
                  >
                    {preset}%
                  </button>
                ))}
              </div>

              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-risk" className="text-xs text-muted-foreground">
                    Custom Risk %
                  </Label>
                  {isCustomRisk && (
                    <Badge variant="outline" className="text-[10px]">
                      Custom
                    </Badge>
                  )}
                </div>
                <Input
                  id="custom-risk"
                  type="number"
                  value={customRiskInput}
                  onChange={(e) => {
                    setCustomRiskInput(e.target.value);
                    setIsCustomRisk(true);
                  }}
                  className="h-9"
                  placeholder="e.g. 0.75"
                  min={0}
                  max={100}
                  step={0.01}
                />
              </div>

              <p className="text-xs text-muted-foreground">Saved globally and used across all risk calculations</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Asset Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAssetCategory("FX")}
                  className={cn(
                    "py-2 px-4 text-sm font-medium rounded-md border transition-all",
                    assetCategory === "FX"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:bg-muted",
                  )}
                >
                  FX / Commodities
                </button>
                <button
                  onClick={() => setAssetCategory("Futures")}
                  className={cn(
                    "py-2 px-4 text-sm font-medium rounded-md border transition-all",
                    assetCategory === "Futures"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:bg-muted",
                  )}
                >
                  Futures
                </button>
              </div>
            </div>

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
                    {currentInstrument.type === "Futures" ? "Tick" : "Pip"} value: {sym}{currentInstrument.pipValue.toFixed(2)}
                  </span>
                  <span>{currentInstrument.type === "Futures" ? "Per contract" : "Per standard lot"}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Current Price</span>
                <span className="font-medium text-foreground">{displayPrice}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop-distance" className="text-sm font-medium">
                Stop Distance ({currentInstrument?.unitLabel || "pips"})
              </Label>

              <Input
                id="stop-distance"
                type="number"
                value={stopDistanceInput}
                onChange={(e) => setStopDistanceInput(e.target.value)}
                className="h-10"
                min={0}
                step={currentInstrument?.type === "Futures" ? 1 : 0.1}
                placeholder={assetCategory === "FX" ? "30" : "10"}
              />

              {isEffectivelyLinked && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={includeSpread}
                      onChange={(e) => setIncludeSpread(e.target.checked)}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    Include spread in stop distance
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Spread</span>
                    <Input
                      type="number"
                      value={spreadInput}
                      onChange={(e) => setSpreadInput(e.target.value)}
                      className={cn("h-8 w-28 text-xs", !includeSpread && "opacity-60")}
                      disabled={!includeSpread}
                      min={0}
                      step={currentInstrument?.type === "Futures" ? 1 : 0.1}
                      placeholder="Enter current"
                    />
                  </div>
                </div>
              )}

              {isEffectivelyLinked && includeSpread && (
                <p className="text-[11px] text-muted-foreground">
                  Effective stop distance used: <span className="font-medium">{effectiveStopDistance || 0}</span>{" "}
                  {currentInstrument?.unitLabel || "pips"}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-6 bg-muted/50 rounded-xl border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-5">Calculation Results</h3>

              <div className="space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">Account Balance</span>
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {sym}{effectiveBalance.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Risk %</span>
                  <Badge variant="secondary" className="text-sm font-medium">
                    {effectiveRiskPercent}%
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{sym} Risked</span>
                  <span className="text-xl font-bold text-destructive">
                    {sym}{results.riskAmount.toFixed(2)}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {currentInstrument?.type === "Futures" ? "Contracts" : "Position Size"}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-primary">{results.formattedSize}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Note:</span> Calculations update instantly as you adjust
                inputs. Always verify position sizes with your broker before placing trades.
              </p>
            </div>

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
                    <span className="text-muted-foreground">
                      {currentInstrument.type === "Futures" ? "Tick Value" : "Pip Value"}
                    </span>
                    <p className="font-medium text-foreground">{sym}{currentInstrument.pipValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {currentInstrument.type === "Futures" ? "Tick Size" : "Pip Size"}
                    </span>
                    <p className="font-medium text-foreground">{currentInstrument.pipSize}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
