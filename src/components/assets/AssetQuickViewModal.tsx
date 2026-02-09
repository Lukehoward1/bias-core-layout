import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAssets } from "@/hooks/use-watchlist";
import { useWatchlist } from "@/hooks/use-watchlist";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  StarOff,
  BarChart3,
  Activity,
  Shield,
} from "lucide-react";

interface AssetQuickViewModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetQuickViewModal({
  symbol,
  isOpen,
  onClose,
}: AssetQuickViewModalProps) {
  const { getAssetBySymbol } = useAssets();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const asset = getAssetBySymbol(symbol);

  if (!asset) return null;

  const biasIcon =
    asset.biasDirection === "Bullish" ? (
      <TrendingUp className="h-4 w-4 text-emerald-400" />
    ) : asset.biasDirection === "Bearish" ? (
      <TrendingDown className="h-4 w-4 text-red-400" />
    ) : (
      <Minus className="h-4 w-4 text-yellow-400" />
    );

  const biasColor =
    asset.biasDirection === "Bullish"
      ? "text-emerald-400"
      : asset.biasDirection === "Bearish"
        ? "text-red-400"
        : "text-yellow-400";

  const inWatchlist = isInWatchlist(symbol);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        style={{ zIndex: 200 }}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-bold">
                {asset.displayName}
              </DialogTitle>
              <Badge variant="outline" className="text-xs">
                {asset.category}
              </Badge>
            </div>
            <button
              onClick={() => toggleWatchlist(symbol)}
              className="p-1 rounded hover:bg-accent transition-colors"
              title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              {inWatchlist ? (
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </div>
          <DialogDescription className="sr-only">
            Quick view for {asset.displayName}
          </DialogDescription>
        </DialogHeader>

        {/* Price */}
        <div className="flex items-baseline gap-3 mt-2">
          <span className="text-3xl font-bold tracking-tight">
            {asset.latestPrice}
          </span>
          <span
            className={`text-sm font-medium ${
              asset.priceChange.startsWith("+")
                ? "text-emerald-400"
                : asset.priceChange.startsWith("-")
                  ? "text-red-400"
                  : "text-muted-foreground"
            }`}
          >
            {asset.priceChange}
          </span>
        </div>

        {/* Bias */}
        <div className="flex items-center gap-2 mt-1">
          {biasIcon}
          <span className={`font-semibold ${biasColor}`}>
            {asset.biasDirection}
          </span>
          <span className="text-xs text-muted-foreground">
            ({asset.biasConfidence}% confidence)
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Card className="bg-muted/40 border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-sm font-semibold">{asset.volume}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/40 border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Spread</p>
                <p className="text-sm font-semibold">{asset.spread}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/40 border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p className="text-sm font-semibold">
                  {asset.biasConfidence}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/40 border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Sentiment</p>
                <p className="text-sm font-semibold">{asset.sentiment}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insight */}
        {asset.insight && (
          <p className="text-xs text-muted-foreground italic mt-3">
            💡 {asset.insight}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
