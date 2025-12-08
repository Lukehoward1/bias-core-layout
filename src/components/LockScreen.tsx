import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Clock, ChevronRight, ExternalLink, Pencil, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

// Mock news data with identifiers for navigation
const redNews = [
  { id: 'nfp-1', time: '08:30', currency: 'USD', event: 'Non-Farm Payrolls', impact: 'High' as const },
  { id: 'cpi-eur-1', time: '10:00', currency: 'EUR', event: 'CPI Flash Estimate', impact: 'High' as const },
  { id: 'rate-gbp-1', time: '14:00', currency: 'GBP', event: 'Interest Rate Decision', impact: 'High' as const },
];

// Mock session data
const currentSession = {
  name: 'London',
  status: 'live' as const,
  nextSession: 'New York',
  nextSessionIn: '2h 15m'
};

// All available pairs with bias data
const allPairsWithBias = [
  { symbol: 'XAUUSD', bias: 'Bullish', confidence: 85 },
  { symbol: 'EURUSD', bias: 'Bullish', confidence: 72 },
  { symbol: 'GBPUSD', bias: 'Bearish', confidence: 68 },
  { symbol: 'USDJPY', bias: 'Bullish', confidence: 75 },
  { symbol: 'AUDUSD', bias: 'Bearish', confidence: 62 },
  { symbol: 'USDCAD', bias: 'Bullish', confidence: 58 },
  { symbol: 'NZDUSD', bias: 'Bearish', confidence: 55 },
  { symbol: 'BTCUSD', bias: 'Bullish', confidence: 80 },
];

const STORAGE_KEY = 'streambias-dashboard-favorites';
const MAX_FAVORITES = 5;

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [favoritePairs, setFavoritePairs] = useState<string[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [tempSelection, setTempSelection] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load favorite pairs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFavoritePairs(parsed);
      } catch {
        // Fall back to default
        setFavoritePairs(['XAUUSD', 'EURUSD']);
      }
    } else {
      // Default to first 2 pairs if no favorites set
      const watchlist = localStorage.getItem('watchlist');
      if (watchlist) {
        try {
          const parsed = JSON.parse(watchlist);
          setFavoritePairs(parsed.slice(0, 2));
        } catch {
          setFavoritePairs(['XAUUSD', 'EURUSD']);
        }
      } else {
        setFavoritePairs(['XAUUSD', 'EURUSD']);
      }
    }
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Navigate to calendar with specific event
  const handleNewsClick = (e: React.MouseEvent, eventId: string, eventName: string) => {
    e.stopPropagation();
    navigate(`/calendar?event=${encodeURIComponent(eventName)}`);
  };

  // Navigate to calendar page
  const handleViewAllNews = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/calendar');
  };

  // Navigate to asset detail
  const handleBiasClick = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    navigate(`/asset/${symbol}?from=Dashboard`);
  };

  // Handle background click to unlock
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onUnlock();
    }
  };

  // Open manage modal
  const handleOpenManageModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempSelection([...favoritePairs]);
    setIsManageModalOpen(true);
  };

  // Toggle pair selection in modal
  const handleTogglePair = (symbol: string) => {
    if (tempSelection.includes(symbol)) {
      setTempSelection(tempSelection.filter(s => s !== symbol));
    } else if (tempSelection.length < MAX_FAVORITES) {
      setTempSelection([...tempSelection, symbol]);
    }
  };

  // Save favorites
  const handleSaveFavorites = () => {
    setFavoritePairs(tempSelection);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempSelection));
    setIsManageModalOpen(false);
  };

  // Get bias data for displayed pairs
  const displayedPairs = favoritePairs
    .map(symbol => allPairsWithBias.find(p => p.symbol === symbol))
    .filter(Boolean) as typeof allPairsWithBias;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center"
        onClick={handleBackgroundClick}
      >
        <div className="text-center space-y-6 px-6 max-w-2xl w-full" onClick={handleBackgroundClick}>
          {/* Time */}
          <div className="cursor-pointer" onClick={onUnlock}>
            <div className="text-8xl font-light text-white tracking-tight mb-2">
              {formatTime(currentTime)}
            </div>
            <div className="text-lg text-gray-400">
              {formatDate(currentTime)}
            </div>
          </div>

          {/* Session Info - Informational only, not clickable */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <div className={`w-2 h-2 rounded-full ${currentSession.status === 'live' ? 'bg-success animate-pulse' : 'bg-warning'}`} />
            <span className="text-sm text-gray-300">
              {currentSession.name} Session {currentSession.status === 'live' ? 'Live' : `in ${currentSession.nextSessionIn}`}
            </span>
            <Clock className="h-3 w-3 text-gray-500" />
          </div>

          {/* Dashboard Focus Pairs */}
          <div className="space-y-2">
            <button
              onClick={handleOpenManageModal}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              <span>Edit pairs</span>
            </button>
            <div className="flex justify-center gap-3 flex-wrap">
              {displayedPairs.map((market) => (
                <button
                  key={market.symbol}
                  onClick={(e) => handleBiasClick(e, market.symbol)}
                  className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all duration-200"
                >
                  <span className="text-sm font-medium text-white">{market.symbol}</span>
                  <div className={`flex items-center gap-1 ${market.bias === 'Bullish' ? 'text-success' : 'text-destructive'}`}>
                    {market.bias === 'Bullish' ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs">{market.bias}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-gray-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Today's Red News */}
          <div className="space-y-3 mt-8">
            <button 
              onClick={handleViewAllNews}
              className="group flex items-center justify-center gap-2 mx-auto hover:opacity-80 transition-opacity"
            >
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
                Today's Red News
              </h3>
              <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-primary transition-colors" />
            </button>
            <div className="space-y-2">
              {redNews.map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => handleNewsClick(e, item.id, item.event)}
                  className="w-full bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 hover:border-red-500/30 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-gray-400 min-w-[60px] group-hover:text-gray-300 transition-colors">
                      {item.time}
                    </span>
                    <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs group-hover:bg-red-500/10 transition-colors">
                      {item.currency}
                    </Badge>
                    <span className="text-sm text-white flex-1 text-left group-hover:text-primary transition-colors">
                      {item.event}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Unlock prompt */}
          <button 
            onClick={onUnlock}
            className="mt-10 text-sm text-gray-500 hover:text-gray-400 animate-pulse transition-colors"
          >
            Tap anywhere to unlock your dashboard
          </button>
        </div>
      </div>

      {/* Manage Dashboard Focus Pairs Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Dashboard Focus Pairs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose up to {MAX_FAVORITES} pairs to display on your dashboard lock screen.
            </p>
            
            {tempSelection.length >= MAX_FAVORITES && (
              <p className="text-xs text-warning bg-warning/10 px-3 py-2 rounded-md">
                You can pin up to {MAX_FAVORITES} pairs on your dashboard.
              </p>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allPairsWithBias.map((pair) => {
                const isSelected = tempSelection.includes(pair.symbol);
                const isDisabled = !isSelected && tempSelection.length >= MAX_FAVORITES;
                
                return (
                  <div
                    key={pair.symbol}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 border-primary/30' 
                        : isDisabled
                          ? 'bg-muted/30 border-border opacity-50'
                          : 'bg-muted/50 border-border hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => handleTogglePair(pair.symbol)}
                      />
                      <span className="font-medium text-foreground">{pair.symbol}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${pair.bias === 'Bullish' ? 'text-success' : 'text-destructive'}`}>
                      {pair.bias === 'Bullish' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{pair.bias}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsManageModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFavorites}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
