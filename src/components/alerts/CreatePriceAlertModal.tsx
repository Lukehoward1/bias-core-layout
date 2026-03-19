import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowUp, ArrowDown, Info } from "lucide-react";
import { assetsData } from "@/data/assets";
import type { PriceAlert, PriceAlertDirection, PriceAlertTriggerType, PriceAlertTimeframe } from "@/types/alerts";
import { useAlertsContext } from "@/contexts/AlertsContext";
import { useMarketQuote } from "@/hooks/use-market-quotes";
import { toast } from "sonner";

interface CreatePriceAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /**
   * Optional: if provided, modal becomes "Edit" mode and pre-fills fields
   */
  editingAlert?: PriceAlert | null;

  /**
   * Optional: convenience default when opening from elsewhere
   */
  defaultAsset?: string;
}

const timeframes: PriceAlertTimeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"];

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

export function CreatePriceAlertModal({ open, onOpenChange, defaultAsset, editingAlert }: CreatePriceAlertModalProps) {
  const { addPriceAlert, updatePriceAlert } = useAlertsContext();

  const isEditMode = !!editingAlert;

  const [asset, setAsset] = useState(defaultAsset || "");
  const [direction, setDirection] = useState<PriceAlertDirection>("above");
  const [triggerType, setTriggerType] = useState<PriceAlertTriggerType>("wick");
  const [price, setPrice] = useState("");
  const [timeframe, setTimeframe] = useState<PriceAlertTimeframe>("15m");

  const selectedAsset = useMemo(() => assetsData.find((a) => a.symbol === asset), [asset]);
  const quote = useMarketQuote(asset);

  const livePrice = useMemo(() => {
    if (quote?.last != null) return formatPriceNoCommas(quote.last);
    if (selectedAsset?.latestPrice) return formatPriceNoCommas(selectedAsset.latestPrice);
    return "—";
  }, [quote, selectedAsset]);

  // Prefill when opening
  useEffect(() => {
    if (!open) return;

    if (editingAlert) {
      setAsset(editingAlert.asset || "");
      setDirection(editingAlert.direction || "above");
      setTriggerType(editingAlert.triggerType || "wick");
      setPrice(String(editingAlert.price ?? ""));
      setTimeframe((editingAlert.timeframe as PriceAlertTimeframe) || "15m");
      return;
    }

    setAsset(defaultAsset || "");
    setDirection("above");
    setTriggerType("wick");
    setPrice("");
    setTimeframe("15m");
  }, [open, editingAlert, defaultAsset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!asset || !price) {
      toast.error("Please fill in all required fields");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (triggerType === "close" && !timeframe) {
      toast.error("Please select a timeframe for close-based alerts");
      return;
    }

    const assetDisplayName = selectedAsset?.displayName || asset;

    if (editingAlert) {
      updatePriceAlert(editingAlert.id, {
        asset,
        assetDisplayName,
        direction,
        triggerType,
        price: priceNum,
        timeframe: triggerType === "close" ? timeframe : undefined,
      });

      toast.success("Price alert updated");
      onOpenChange(false);
      return;
    }

    addPriceAlert({
      asset,
      assetDisplayName,
      direction,
      triggerType,
      price: priceNum,
      timeframe: triggerType === "close" ? timeframe : undefined,
    });

    toast.success("Price alert created");
    onOpenChange(false);

    setAsset(defaultAsset || "");
    setDirection("above");
    setTriggerType("wick");
    setPrice("");
    setTimeframe("15m");
  };

  const previewMessage = useMemo(() => {
    if (!asset || !price) return null;

    const assetName = selectedAsset?.displayName || asset;
    if (triggerType === "wick") {
      return `"${assetName} wicked ${direction} ${price}"`;
    }
    return `"${assetName} closed ${direction} ${price} on ${timeframe}"`;
  }, [asset, price, selectedAsset, triggerType, direction, timeframe]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[60]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isEditMode ? "Edit Price Alert" : "Create Price Alert"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Instrument</Label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {assetsData.map((a) => (
                  <SelectItem key={a.symbol} value={a.symbol}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1">
                        {a.category}
                      </Badge>
                      {a.displayName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <RadioGroup
              value={direction}
              onValueChange={(v) => setDirection(v as PriceAlertDirection)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="above" id="above" />
                <Label htmlFor="above" className="flex items-center gap-1.5 cursor-pointer">
                  <ArrowUp className="h-4 w-4 text-green-500" />
                  Above
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="below" id="below" />
                <Label htmlFor="below" className="flex items-center gap-1.5 cursor-pointer">
                  <ArrowDown className="h-4 w-4 text-red-500" />
                  Below
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Trigger Type</Label>
            <RadioGroup
              value={triggerType}
              onValueChange={(v) => setTriggerType(v as PriceAlertTriggerType)}
              className="space-y-2"
            >
              <div className="flex items-start space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="wick" id="wick" className="mt-0.5" />
                <div>
                  <Label htmlFor="wick" className="cursor-pointer font-medium">
                    Wick / Touch
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Triggers when price trades beyond the level (any touch)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="close" id="close" className="mt-0.5" />
                <div>
                  <Label htmlFor="close" className="cursor-pointer font-medium">
                    Close Above/Below
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Triggers only when a candle closes beyond the level
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {triggerType === "close" && (
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as PriceAlertTimeframe)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Price Level</Label>
            <Input
              type="number"
              step="any"
              placeholder={selectedAsset ? `Current: ${livePrice}` : "Enter price level"}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {selectedAsset && <p className="text-xs text-muted-foreground">Current price: {livePrice}</p>}
          </div>

          {previewMessage && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Alert preview:</p>
                  <p className="text-sm font-medium">{previewMessage}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditMode ? "Save Changes" : "Create Alert"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
