import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Clock, ChevronRight, ExternalLink, Pencil, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAssets } from "@/hooks/use-watchlist";
import { type Asset } from "@/data/assets";
import { useSessionLock } from "@/hooks/use-session-lock";

// Trading sessions data
const tradingSessions = [
  { name: 'Sydney', openHour: 22, closeHour: 7, accent: '#2EC4B6' },
  { name: 'Asia', openHour: 0, closeHour: 9, accent: '#4361EE' },
  { name: 'London', openHour: 8, closeHour: 17, accent: '#F4D35E' },
  { name: 'New York', openHour: 13, closeHour: 22, accent: '#F77F00' },
];

function getSessionStatus(session: typeof tradingSessions[0], currentHour: number) {
  const { openHour, closeHour } = session;
  
  if (openHour > closeHour) {
    if (currentHour >= openHour || currentHour < closeHour) {
      return { isLive: true, timeUntilOpen: 0 };
    }
  } else {
    if (currentHour >= openHour && currentHour < closeHour) {
      return { isLive: true, timeUntilOpen: 0 };
    }
  }
  
  let hoursUntil = openHour - currentHour;
  if (hoursUntil <= 0) hoursUntil += 24;
  
  const hours = Math.floor(hoursUntil);
  const minutes = Math.floor((hoursUntil % 1) * 60);
  
  return { isLive: false, hours, minutes };
}

function formatTimeUntil(hours: number, minutes: number) {
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

const redNews = [
  { id: 'nfp-1', time: '08:30', currency: 'USD', event: 'Non-Farm Payrolls', impact: 'High' as const },
  { id: 'cpi-eur-1', time: '10:00', currency: 'EUR', event: 'CPI Flash Estimate', impact: 'High' as const },
  { id: 'rate-gbp-1', time: '14:00', currency: 'GBP', event: 'Interest Rate Decision', impact: 'High' as const },
];

const STORAGE_KEY = 'streambias-dashboard-favorites';
const MAX_FAVORITES = 5;

export function LockScreen() {
  const { unlock, pinEnabled, pinSet } = useSessionLock();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [favoritePairs, setFavoritePairs] = useState<string[]>([]);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [tempSelection, setTempSelection] = useState<string[]>([]);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const sessionIconRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { assets, getAssetBySymbol } = useAssets();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        sessionIconRef.current &&
        !sessionIconRef.current.contains(e.target as Node)
      ) {
        setShowSessionDropdown(false);
      }
    };

    if (showSessionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSessionDropdown]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFavoritePairs(parsed);
      } catch {
        setFavoritePairs(['XAUUSD', 'EURUSD']);
      }
    } else {
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

  useEffect(() => {
    if (showPinEntry && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [showPinEntry]);

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

  const attemptUnlock = (navigationPath?: string) => {
    if (pinEnabled && pinSet) {
      setPendingNavigation(navigationPath || null);
      setShowPinEntry(true);
      setPinInput('');
      setPinError(false);
    } else {
      const success = unlock();
      if (success && navigationPath) {
        navigate(navigationPath);
      }
    }
  };

  const handlePinSubmit = () => {
    const success = unlock(pinInput);
    if (success) {
      setShowPinEntry(false);
      setPinInput('');
      if (pendingNavigation) {
        navigate(pendingNavigation);
        setPendingNavigation(null);
      }
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pinInput.length === 4) {
      handlePinSubmit();
    }
    if (e.key === 'Escape') {
      setShowPinEntry(false);
      setPinInput('');
      setPinError(false);
    }
  };

  const handleNewsClick = (e: React.MouseEvent, eventId: string, eventName: string) => {
    e.stopPropagation();
    attemptUnlock(`/calendar?event=${encodeURIComponent(eventName)}`);
  };

  const handleViewAllNews = (e: React.MouseEvent) => {
    e.stopPropagation();
    attemptUnlock('/calendar');
  };

  const handleBiasClick = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    attemptUnlock(`/asset/${symbol}?from=Dashboard`);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isManageModalOpen && !showPinEntry) {
      attemptUnlock();
    }
  };

  const handleOpenManageModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempSelection([...favoritePairs]);
    setIsManageModalOpen(true);
  };

  const handleTogglePair = (symbol: string) => {
    if (tempSelection.includes(symbol)) {
      setTempSelection(tempSelection.filter(s => s !== symbol));
    } else if (tempSelection.length < MAX_FAVORITES) {
      setTempSelection([...tempSelection, symbol]);
    }
  };

  const handleSaveFavorites = () => {
    setFavoritePairs(tempSelection);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempSelection));
    setIsManageModalOpen(false);
  };

  const displayedPairs: Asset[] = favoritePairs
    .map(symbol => getAssetBySymbol(symbol))
    .filter((asset): asset is Asset => asset !== undefined);

  const getBiasIcon = (bias: string) => {
    if (bias === 'Bullish') return <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />;
    if (bias === 'Bearish') return <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />;
    return <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />;
  };

  const getBiasColor = (bias: string) => {
    if (bias === 'Bullish') return 'text-success';
    if (bias === 'Bearish') return 'text-destructive';
    return 'text-muted-foreground';
  };

  const lockScreenContent = (
    <div 
      className="fixed inset-0 z-50 bg-background dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-950 dark:to-black flex items-center justify-center"
      onClick={handleBackgroundClick}
    >
      <div className="text-center space-y-6 px-6 max-w-2xl w-full" onClick={handleBackgroundClick}>
        {/* Time */}
        <div className="cursor-pointer" onClick={() => attemptUnlock()}>
          <div className="text-7xl sm:text-8xl font-light text-foreground tracking-tight mb-2">
            {formatTime(currentTime)}
          </div>
          <div className="text-base sm:text-lg text-muted-foreground">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* Session Info with Interactive Timer Dropdown */}
        <div className="relative inline-block">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10">
            {(() => {
              const currentHour = currentTime.getHours();
              const liveSession = tradingSessions.find(s => getSessionStatus(s, currentHour).isLive);
              return (
                <>
                  <div className={`w-2 h-2 rounded-full ${liveSession ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                  <span className="text-sm text-foreground dark:text-gray-300">
                    {liveSession ? `${liveSession.name} Session Live` : 'Market Closed'}
                  </span>
                </>
              );
            })()}
            <button
              ref={sessionIconRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowSessionDropdown(!showSessionDropdown);
              }}
              onMouseEnter={() => setShowSessionDropdown(true)}
              className="p-1 -m-1 rounded-full hover:bg-muted dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="View session times"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground dark:text-gray-400 hover:text-foreground transition-colors" />
            </button>
          </div>

          {/* Session Timer Dropdown */}
          {showSessionDropdown && (
            <div 
              ref={dropdownRef}
              onMouseLeave={() => setShowSessionDropdown(false)}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-[60]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 space-y-2">
                {tradingSessions.map(session => {
                  const status = getSessionStatus(session, currentTime.getHours());
                  return (
                    <div 
                      key={session.name}
                      className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                        status.isLive ? 'bg-success/10 border border-success/20' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-2 h-2 rounded-full ${status.isLive ? 'animate-pulse' : ''}`}
                          style={{ backgroundColor: session.accent }}
                        />
                        <span className={`text-sm ${status.isLive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {session.name}
                        </span>
                      </div>
                      <span className={`text-xs ${status.isLive ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                        {status.isLive ? 'Live' : `opens in ${formatTimeUntil(status.hours!, status.minutes!)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Focus Pairs */}
        <div className="space-y-2">
          <button
            onClick={handleOpenManageModal}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit pairs</span>
          </button>
          <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
            {displayedPairs.map((asset) => (
              <button
                key={asset.symbol}
                onClick={(e) => handleBiasClick(e, asset.symbol)}
                className="group flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/10 hover:border-primary/30 transition-all duration-200"
              >
                <span className="text-xs sm:text-sm font-medium text-foreground">{asset.symbol}</span>
                <div className={`flex items-center gap-1 ${getBiasColor(asset.biasDirection)}`}>
                  {getBiasIcon(asset.biasDirection)}
                  <span className="text-[10px] sm:text-xs">{asset.biasDirection}</span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Today's Red News */}
        <div className="space-y-3 mt-6 sm:mt-8">
          <button 
            onClick={handleViewAllNews}
            className="group flex items-center justify-center gap-2 mx-auto hover:opacity-80 transition-opacity"
          >
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
              Today's Red News
            </h3>
            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
          <div className="space-y-2">
            {redNews.map((item) => (
              <button
                key={item.id}
                onClick={(e) => handleNewsClick(e, item.id, item.event)}
                className="w-full bg-muted/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/10 hover:border-destructive/30 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground min-w-[45px] sm:min-w-[60px] group-hover:text-foreground transition-colors">
                    {item.time}
                  </span>
                  <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px] sm:text-xs group-hover:bg-destructive/10 transition-colors">
                    {item.currency}
                  </Badge>
                  <span className="text-xs sm:text-sm text-foreground flex-1 text-left group-hover:text-primary transition-colors truncate">
                    {item.event}
                  </span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Unlock prompt */}
        <button 
          onClick={() => attemptUnlock()}
          className="mt-8 sm:mt-10 text-xs sm:text-sm text-muted-foreground hover:text-foreground animate-pulse transition-colors"
        >
          {pinEnabled && pinSet ? 'Tap anywhere to enter PIN' : 'Tap anywhere to unlock your dashboard'}
        </button>
      </div>

      {/* PIN Entry Panel */}
      {showPinEntry && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
          onClick={(e) => {
            e.stopPropagation();
            setShowPinEntry(false);
            setPinInput('');
            setPinError(false);
          }}
        >
          <div 
            className="w-full max-w-xs mx-4 bg-card border border-border rounded-lg shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-foreground text-center mb-4">Enter PIN</h2>
            <Input
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPinInput(val);
                setPinError(false);
              }}
              onKeyDown={handlePinKeyDown}
              className={`text-center text-2xl tracking-[0.5em] ${pinError ? 'border-destructive' : ''}`}
              placeholder="••••"
            />
            {pinError && (
              <p className="text-xs text-destructive text-center mt-2">Incorrect PIN</p>
            )}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPinEntry(false);
                  setPinInput('');
                  setPinError(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={pinInput.length !== 4}
                onClick={handlePinSubmit}
              >
                Unlock
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Dashboard Focus Pairs Panel */}
      {isManageModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setIsManageModalOpen(false)}
        >
          <div 
            className="w-full max-w-md mx-4 bg-card border border-border rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Dashboard Focus Pairs</h2>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose up to {MAX_FAVORITES} pairs to display on your dashboard lock screen.
              </p>
              
              {tempSelection.length >= MAX_FAVORITES && (
                <p className="text-xs text-warning bg-warning/10 px-3 py-2 rounded-md">
                  You can pin up to {MAX_FAVORITES} pairs on your dashboard.
                </p>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {assets.map((asset) => {
                  const isSelected = tempSelection.includes(asset.symbol);
                  const isDisabled = !isSelected && tempSelection.length >= MAX_FAVORITES;
                  
                  return (
                    <div
                      key={asset.symbol}
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
                          onCheckedChange={() => handleTogglePair(asset.symbol)}
                        />
                        <span className="font-medium text-foreground">{asset.symbol}</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${getBiasColor(asset.biasDirection)}`}>
                        {asset.biasDirection === 'Bullish' ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : asset.biasDirection === 'Bearish' ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        <span>{asset.biasDirection}</span>
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
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Use createPortal to render directly to document.body
  return createPortal(lockScreenContent, document.body);
}
