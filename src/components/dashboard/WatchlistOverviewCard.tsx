import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Star } from 'lucide-react';
import { useWatchlist } from '@/hooks/use-watchlist';

interface WatchlistOverviewCardProps {
  isEditMode?: boolean;
}

export function WatchlistOverviewCard({ isEditMode }: WatchlistOverviewCardProps) {
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

  // Show up to 5 watchlist assets
  const displayAssets = watchlistAssets.slice(0, 5);

  if (displayAssets.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent" />
            Watchlist Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Star className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No assets in your watchlist</p>
            <p className="text-xs text-muted-foreground">
              Add assets from the Markets page to see them here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-4 w-4 text-accent" />
          Watchlist Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayAssets.map((asset) => (
            <div 
              key={asset.symbol} 
              onClick={() => handleAssetClick(asset.symbol)}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">{asset.symbol}</span>
                  <div className={`flex items-center gap-1 text-xs font-medium ${getBiasColor(asset.biasDirection)}`}>
                    {getBiasIcon(asset.biasDirection)}
                    {asset.biasDirection}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Confidence: {asset.biasConfidence}%</span>
                  <span>Spread: {asset.spread}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{asset.latestPrice}</div>
                  <div className={`text-xs ${asset.priceChange?.startsWith('+') ? 'text-success' : asset.priceChange?.startsWith('-') ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {asset.priceChange || '0.00%'}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          ))}
        </div>
        {watchlistAssets.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            +{watchlistAssets.length - 5} more in watchlist
          </p>
        )}
      </CardContent>
    </Card>
  );
}
