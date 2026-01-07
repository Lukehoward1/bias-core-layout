import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Star } from 'lucide-react';
import { useWatchlist } from '@/hooks/use-watchlist';
import { cn } from '@/lib/utils';
import type { CardSize } from '@/hooks/use-dashboard-layout';

interface WatchlistOverviewCardProps {
  isEditMode?: boolean;
  size?: CardSize;
}

export function WatchlistOverviewCard({ isEditMode, size = 'standard' }: WatchlistOverviewCardProps) {
  const navigate = useNavigate();
  const { watchlistAssets } = useWatchlist();

  const getBiasIcon = (bias: string) => {
    if (bias === 'Bullish') return <TrendingUp className="h-4 w-4" />;
    if (bias === 'Bearish') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getBiasColor = (bias: string) => {
    if (bias === 'Bullish') return 'text-success';
    if (bias === 'Bearish') return 'text-destructive';
    return 'text-muted-foreground';
  };

  const handleAssetClick = (symbol: string) => {
    if (isEditMode) return;
    navigate(`/asset/${symbol}?from=Dashboard`);
  };

  // Show assets based on size
  const maxAssets = size === 'compact' ? 3 : 5;
  const displayAssets = watchlistAssets.slice(0, maxAssets);
  const isCompact = size === 'compact';

  if (displayAssets.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className={isCompact ? "pb-2" : undefined}>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent" />
            Watchlist Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "flex flex-col items-center justify-center text-center",
            isCompact ? "py-3" : "py-6"
          )}>
            <Star className={cn(
              "text-muted-foreground/50 mb-2",
              isCompact ? "h-6 w-6" : "h-8 w-8 mb-3"
            )} />
            <p className="text-sm text-muted-foreground mb-2">No assets in your watchlist</p>
            {!isCompact && (
              <p className="text-xs text-muted-foreground">
                Add assets from the Markets page to see them here
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className={isCompact ? "pb-2" : undefined}>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-4 w-4 text-accent" />
          Watchlist Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn(
          isCompact ? "space-y-2" : "space-y-3"
        )}>
          {displayAssets.map((asset) => (
            <div 
              key={asset.symbol} 
              onClick={() => handleAssetClick(asset.symbol)}
              className={cn(
                "flex items-center justify-between bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors group",
                isCompact ? "p-2" : "p-3"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "font-semibold text-foreground",
                    isCompact && "text-sm"
                  )}>{asset.symbol}</span>
                  <div className={`flex items-center gap-1 text-xs font-medium ${getBiasColor(asset.biasDirection)}`}>
                    {getBiasIcon(asset.biasDirection)}
                    {!isCompact && asset.biasDirection}
                  </div>
                </div>
                {!isCompact && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Confidence: {asset.biasConfidence}%</span>
                    <span>Spread: {asset.spread}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className={cn(
                    "font-medium text-foreground",
                    isCompact ? "text-xs" : "text-sm"
                  )}>{asset.latestPrice}</div>
                  <div className={cn(
                    isCompact ? "text-[10px]" : "text-xs",
                    asset.priceChange?.startsWith('+') ? 'text-success' : asset.priceChange?.startsWith('-') ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    {asset.priceChange || '0.00%'}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          ))}
        </div>
        {watchlistAssets.length > maxAssets && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            +{watchlistAssets.length - maxAssets} more in watchlist
          </p>
        )}
      </CardContent>
    </Card>
  );
}
