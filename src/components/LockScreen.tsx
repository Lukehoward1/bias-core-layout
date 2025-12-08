import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Clock, ChevronRight, ExternalLink } from "lucide-react";

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

// Mock market bias data
const marketBias = [
  { symbol: 'XAUUSD', bias: 'Bullish', confidence: 85 },
  { symbol: 'EURUSD', bias: 'Bullish', confidence: 72 },
];

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
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
    // Navigate to calendar with event parameter to auto-open the event detail
    navigate(`/calendar?event=${encodeURIComponent(eventName)}`);
  };

  // Navigate to calendar page
  const handleViewAllNews = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/calendar');
  };

  // Navigate to alerts page
  const handleSessionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/alerts');
  };

  // Navigate to asset detail
  const handleBiasClick = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    navigate(`/asset/${symbol}?from=Dashboard`);
  };

  // Handle background click to unlock
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only unlock if clicking the background, not interactive elements
    if (e.target === e.currentTarget) {
      onUnlock();
    }
  };

  return (
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

        {/* Session Info - Clickable */}
        <button
          onClick={handleSessionClick}
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all duration-200"
        >
          <div className={`w-2 h-2 rounded-full ${currentSession.status === 'live' ? 'bg-success animate-pulse' : 'bg-warning'}`} />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
            {currentSession.name} Session {currentSession.status === 'live' ? 'Live' : `in ${currentSession.nextSessionIn}`}
          </span>
          <Clock className="h-3 w-3 text-gray-500 group-hover:text-primary transition-colors" />
        </button>

        {/* Market Bias Summary - Clickable */}
        <div className="flex justify-center gap-3">
          {marketBias.map((market) => (
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
  );
}
