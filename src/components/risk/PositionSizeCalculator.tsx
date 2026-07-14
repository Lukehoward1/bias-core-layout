import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler, Lock } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { getFXInstruments, getFuturesInstruments, getInstrumentBySymbol } from "@/data/tradingInstruments";
import { useMarketQuote } from "@/hooks/use-market-quotes";
import { useRiskToolMode } from "@/hooks/use-risk-tool-mode";
import { RiskToolModeToggle } from "@/components/risk/RiskToolModeToggle";
import { useHomeCurrency } from "@/hooks/use-home-currency";
import { currencySymbol } from "@/lib/currency";

interface PositionSizeCalculatorProps {
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

const formatPriceForInput = (value: number, decimals: number) => {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(decimals);
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

export function PositionSizeCalculator({ isAdded, onAdd, onRemove, compact = false }: PositionSizeCalculatorProps) {
  const navigate = useNavigate();
  // ── Account awareness ────────────────────────────────────────────────────
  const {
    mode,
    setMode,
    selectedAccount,
    selectedAccountId,
    setSelectedAccountId,
    connectedAccounts,
    isEffectivelyLinked,
    hasMultipleAccounts,
    isLoading: isAccountLoading,
  } = useRiskToolMode("psc");

  const { homeCurrency } = useHomeCurrency();
  const sym = currencySymbol(homeCurrency);

  const [assetCategory, setAssetCategory] = useState<"FX" | "Futures">("FX");
  const [instrument, setInstrument] = useState<string>("EURUSD");

  const [accountBalanceInput, setAccountBalanceInput] = useState<string>("10000");
  const [riskPercentInput, setRiskPercentInput] = useState<string>("2");
  const [entryPriceInput, setEntryPriceInput] = useState<string>("1.0850");
  const [stopLossInput, setStopLossInput] = useState<string>("1.0820");
  const [takeProfitInput, setTakeProfitInput] = useState<string>("1.0910");

  const [hasManualEntryEdit, setHasManualEntryEdit] = useState<boolean>(false);

  // Pre-seed manual input from account balance on first load (useful when user switches to Manual)
  const balanceInitRef = useRef(false);
  useEffect(() => {
    if (!balanceInitRef.current && selectedAccount && !isAccountLoading) {
      setAccountBalanceInput(selectedAccount.balance.toString());
      balanceInitRef.current = true;
    }
  }, [selectedAccount, isAccountLoading]);

  const instruments = useMemo(() => {
    return assetCategory === "FX" ? getFXInstruments() : getFuturesInstruments();
  }, [assetCategory]);

  const currentInstrument = useMemo(() => {
    return getInstrumentBySymbol(instrument);
  }, [instrument]);

  const quote = useMarketQuote(instrument);

  const accountBalance = useMemo(
    () => (isEffectivelyLinked && selectedAccount ? selectedAccount.balance : toNumberOrZero(accountBalanceInput)),
    [isEffectivelyLinked, selectedAccount, accountBalanceInput],
  );
  const riskPercent = useMemo(() => toNumberOrZero(riskPercentInput), [riskPercentInput]);
  const entryPrice = useMemo(() => toNumberOrZero(entryPriceInput), [entryPriceInput]);
  const stopLoss = useMemo(() => toNumberOrZero(stopLossInput), [stopLossInput]);
  const takeProfit = useMemo(() => toNumberOrZero(takeProfitInput), [takeProfitInput]);

  useEffect(() => {
    const availableInstruments = assetCategory === "FX" ? getFXInstruments() : getFuturesInstruments();

    if (availableInstruments.length > 0 && !availableInstruments.find((i) => i.symbol === instrument)) {
      setInstrument(availableInstruments[0].symbol);
    }

    setHasManualEntryEdit(false);

    if (assetCategory === "FX") {
      setInstrument("EURUSD");
      setEntryPriceInput("1.0850");
      setStopLossInput("1.0820");
      setTakeProfitInput("1.0910");
    } else {
      setInstrument("ES");
      setEntryPriceInput("5200.00");
      setStopLossInput("5190.00");
      setTakeProfitInput("5220.00");
    }
  }, [assetCategory]);

  useEffect(() => {
    if (!currentInstrument || !quote || hasManualEntryEdit) return;

    const decimals =
      currentInstrument.pipSize >= 1
        ? 0
        : currentInstrument.pipSize >= 0.1
          ? 1
          : currentInstrument.pipSize >= 0.01
            ? 2
            : 4;

    setEntryPriceInput(formatPriceForInput(quote.last, decimals));
  }, [quote, currentInstrument, hasManualEntryEdit]);

  const results = useMemo(() => {
    if (!currentInstrument) {
      return {
        riskAmount: "0.00",
        rewardAmount: "0.00",
        lotSize: "0.00",
        stopPips: "0.0",
        tpPips: "0.0",
        rrRatio: "0.00",
        sizeLabel: "lots",
      };
    }

    const riskAmountRaw = (accountBalance * riskPercent) / 100;
    const stopUnitsRaw =
      currentInstrument.pipSize > 0 ? Math.abs(entryPrice - stopLoss) / currentInstrument.pipSize : 0;
    const tpUnitsRaw =
      currentInstrument.pipSize > 0 ? Math.abs(takeProfit - entryPrice) / currentInstrument.pipSize : 0;

    const positionSizeRaw =
      stopUnitsRaw > 0 && currentInstrument.pipValue > 0
        ? riskAmountRaw / (stopUnitsRaw * currentInstrument.pipValue)
        : 0;

    const roundedSize =
      currentInstrument.minIncrement > 0
        ? Math.floor(positionSizeRaw / currentInstrument.minIncrement) * currentInstrument.minIncrement
        : positionSizeRaw;

    const rewardAmountRaw = roundedSize * tpUnitsRaw * currentInstrument.pipValue;
    const rrRatioRaw = stopUnitsRaw > 0 ? tpUnitsRaw / stopUnitsRaw : 0;

    return {
      riskAmount: (Number.isFinite(riskAmountRaw) ? riskAmountRaw : 0).toFixed(2),
      rewardAmount: (Number.isFinite(rewardAmountRaw) ? rewardAmountRaw : 0).toFixed(2),
      lotSize: (Number.isFinite(roundedSize) ? roundedSize : 0).toFixed(currentInstrument.type === "Futures" ? 0 : 2),
      stopPips: (Number.isFinite(stopUnitsRaw) ? stopUnitsRaw : 0).toFixed(1),
      tpPips: (Number.isFinite(tpUnitsRaw) ? tpUnitsRaw : 0).toFixed(1),
      rrRatio: (Number.isFinite(rrRatioRaw) ? rrRatioRaw : 0).toFixed(2),
      sizeLabel: currentInstrument.type === "Futures" ? "contracts" : "lots",
    };
  }, [accountBalance, riskPercent, entryPrice, stopLoss, takeProfit, currentInstrument]);

  const displayPrice = formatPriceNoCommas(quote?.last?.toString() ?? "—");

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Position Size</CardTitle>
            </div>
            {onAdd && onRemove && <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Size</span>
            <span className="text-lg font-bold text-primary">
              {results.lotSize} {results.sizeLabel}
            </span>
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
          <div className="flex items-center gap-3">
            <Ruler className="h-5 w-5 text-primary" />
            <CardTitle>Position Size Calculator</CardTitle>
            <RiskToolModeToggle mode={mode} onChange={setMode} />
          </div>
          {onAdd && onRemove && <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Asset Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAssetCategory("FX")}
                  className={`py-2 px-4 text-sm font-medium rounded-md border transition-all ${
                    assetCategory === "FX"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:bg-muted"
                  }`}
                >
                  FX / Commodities
                </button>
                <button
                  onClick={() => setAssetCategory("Futures")}
                  className={`py-2 px-4 text-sm font-medium rounded-md border transition-all ${
                    assetCategory === "Futures"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border hover:bg-muted"
                  }`}
                >
                  Futures
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Instrument</Label>
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {instruments.map((inst) => (
                    <SelectItem key={inst.symbol} value={inst.symbol}>
                      {inst.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Account Size ({sym})</Label>
                {isEffectivelyLinked && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Lock className="h-3 w-3" />
                    Linked
                  </Badge>
                )}
              </div>
              {isEffectivelyLinked && selectedAccount ? (
                <div className="space-y-1.5">
                  <div className="h-9 px-3 rounded-md border border-border bg-muted/50 flex items-center text-sm text-muted-foreground select-none cursor-not-allowed">
                    {sym}{selectedAccount.balance.toLocaleString()}
                  </div>
                  {hasMultipleAccounts && (
                    <Select value={selectedAccountId ?? ""} onValueChange={setSelectedAccountId}>
                      <SelectTrigger className="h-7 w-full text-xs">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : mode === "linked" && !isAccountLoading ? (
                <p className="text-xs text-muted-foreground py-2">
                  No account linked — broker connections are coming soon.
                </p>
              ) : (
                <Input
                  type="number"
                  value={accountBalanceInput}
                  onChange={(e) => setAccountBalanceInput(e.target.value)}
                  className="h-9"
                  placeholder="10000"
                  min={0}
                  step={1}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Risk % per Trade</Label>
              <Input
                type="number"
                value={riskPercentInput}
                onChange={(e) => setRiskPercentInput(e.target.value)}
                step="0.1"
                className="h-9"
                placeholder="2"
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Current Market Price</Label>
              <div className="h-9 px-3 rounded-md border border-border bg-muted/30 flex items-center text-sm text-foreground">
                {displayPrice}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Entry Price</Label>
              <Input
                type="number"
                value={entryPriceInput}
                onChange={(e) => {
                  setEntryPriceInput(e.target.value);
                  setHasManualEntryEdit(true);
                }}
                step={currentInstrument?.pipSize ?? 0.0001}
                className="h-9"
                placeholder="Entry price"
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Stop Loss</Label>
              <Input
                type="number"
                value={stopLossInput}
                onChange={(e) => setStopLossInput(e.target.value)}
                step={currentInstrument?.pipSize ?? 0.0001}
                className="h-9"
                placeholder="Stop loss"
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Take Profit</Label>
              <Input
                type="number"
                value={takeProfitInput}
                onChange={(e) => setTakeProfitInput(e.target.value)}
                step={currentInstrument?.pipSize ?? 0.0001}
                className="h-9"
                placeholder="Take profit"
                min={0}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-muted/50 rounded-lg border border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Results</h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Position Size</span>
                  <span className="text-lg font-bold text-foreground">
                    {results.lotSize} {results.sizeLabel}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Risk Amount</span>
                  <span className="text-lg font-bold text-destructive">
                    {sym}{results.riskAmount}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reward Amount</span>
                  <span className="text-lg font-bold text-success">
                    {sym}{results.rewardAmount}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Reward:Risk Ratio</span>
                  <span className="text-xl font-bold text-primary">{results.rrRatio}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Stop Loss ({currentInstrument?.unitLabel || "pips"})
                  </span>
                  <span className="text-sm font-medium text-foreground">{results.stopPips}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Take Profit ({currentInstrument?.unitLabel || "pips"})
                  </span>
                  <span className="text-sm font-medium text-foreground">{results.tpPips}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium text-sm text-foreground mb-1">Conservative</h3>
                <p className="text-xl font-bold text-foreground mb-1">0.5–1%</p>
                <p className="text-xs text-muted-foreground">Risk per trade for capital preservation</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium text-sm text-foreground mb-1">Moderate</h3>
                <p className="text-xl font-bold text-foreground mb-1">1–2%</p>
                <p className="text-xs text-muted-foreground">Balanced risk for steady growth</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium text-sm text-foreground mb-1">Aggressive</h3>
                <p className="text-xl font-bold text-foreground mb-1">2–3%</p>
                <p className="text-xs text-muted-foreground">Higher risk for faster returns</p>
              </div>
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
                    <p className="font-medium text-foreground">
                      {sym}{currentInstrument.pipValue.toFixed(2)}
                    </p>
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
