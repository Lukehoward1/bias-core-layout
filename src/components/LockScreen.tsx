import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const redNews = [
  { time: '08:30', currency: 'USD', event: 'Non-Farm Payrolls' },
  { time: '10:00', currency: 'EUR', event: 'CPI Flash Estimate' },
  { time: '14:00', currency: 'GBP', event: 'Interest Rate Decision' },
];

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [currentTime, setCurrentTime] = useState(new Date());

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

  return (
    <div 
      className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center cursor-pointer"
      onClick={onUnlock}
    >
      <div className="text-center space-y-8 px-6 max-w-2xl">
        {/* Time */}
        <div>
          <div className="text-8xl font-light text-white tracking-tight mb-2">
            {formatTime(currentTime)}
          </div>
          <div className="text-lg text-gray-400">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* Session Info */}
        <div className="text-sm text-gray-500">
          London Session <span className="text-gray-600">(session logic todo)</span>
        </div>

        {/* Today's Red News */}
        <div className="space-y-4 mt-12">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Today's Red News
          </h3>
          <div className="space-y-3">
            {redNews.map((item, i) => (
              <div 
                key={i} 
                className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-400 min-w-[60px]">
                    {item.time}
                  </span>
                  <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">
                    {item.currency}
                  </Badge>
                  <span className="text-sm text-white flex-1 text-left">
                    {item.event}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unlock prompt */}
        <div className="mt-16 text-sm text-gray-500 animate-pulse">
          Tap anywhere to unlock your dashboard
        </div>
      </div>
    </div>
  );
}
