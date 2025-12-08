import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ChevronRight,
  Radio,
  Clock,
  Bell,
  Star,
  Play,
  User,
  TrendingUp,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Types
interface Webinar {
  id: string;
  title: string;
  host: string;
  assetFocus: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  startTime: string;
  duration: string;
  isLive: boolean;
  viewers?: number;
}

// Demo data for each session
const londonWebinars: Webinar[] = [
  {
    id: 'l1',
    title: 'London Open Scalping Strategy',
    host: 'Marcus Reid',
    assetFocus: 'GBPUSD, EURUSD',
    level: 'Intermediate',
    startTime: '08:00 GMT',
    duration: '90 min',
    isLive: true,
    viewers: 142
  },
  {
    id: 'l2',
    title: 'Gold Analysis & Trade Setup',
    host: 'Sarah Chen',
    assetFocus: 'XAUUSD',
    level: 'Advanced',
    startTime: '09:30 GMT',
    duration: '60 min',
    isLive: false
  },
  {
    id: 'l3',
    title: 'London/NY Overlap Session',
    host: 'James Mitchell',
    assetFocus: 'Major Pairs',
    level: 'Beginner',
    startTime: '13:00 GMT',
    duration: '120 min',
    isLive: false
  }
];

const nyWebinars: Webinar[] = [
  {
    id: 'n1',
    title: 'NY Session Breakout Trades',
    host: 'David Williams',
    assetFocus: 'US30, NAS100',
    level: 'Intermediate',
    startTime: '14:30 GMT',
    duration: '90 min',
    isLive: false
  },
  {
    id: 'n2',
    title: 'Futures Trading Masterclass',
    host: 'Emily Rodriguez',
    assetFocus: 'ES, NQ',
    level: 'Advanced',
    startTime: '15:00 GMT',
    duration: '120 min',
    isLive: false
  },
  {
    id: 'n3',
    title: 'End of Day Review & Analysis',
    host: 'Mike Thompson',
    assetFocus: 'All Markets',
    level: 'Beginner',
    startTime: '20:00 GMT',
    duration: '60 min',
    isLive: false
  }
];

const asiaWebinars: Webinar[] = [
  {
    id: 'a1',
    title: 'Asia Session Range Trading',
    host: 'Kenji Tanaka',
    assetFocus: 'USDJPY, AUDUSD',
    level: 'Intermediate',
    startTime: '00:00 GMT',
    duration: '90 min',
    isLive: false
  },
  {
    id: 'a2',
    title: 'Crypto Night Trading',
    host: 'Alex Park',
    assetFocus: 'BTCUSD, ETHUSD',
    level: 'Advanced',
    startTime: '02:00 GMT',
    duration: '60 min',
    isLive: false
  }
];

type ViewMode = 'landing' | 'london' | 'newyork' | 'asia';

// Session icons as React components
const LondonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="8" width="4" height="12" rx="1" fill="#F4D35E" fillOpacity="0.9"/>
    <line x1="7" y1="4" x2="7" y2="8" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="7" y1="20" x2="7" y2="24" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="12" y="10" width="4" height="8" rx="1" stroke="#F4D35E" strokeWidth="1.5"/>
    <line x1="14" y1="6" x2="14" y2="10" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="18" x2="14" y2="22" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="19" y="6" width="4" height="14" rx="1" fill="#F4D35E" fillOpacity="0.9"/>
    <line x1="21" y1="3" x2="21" y2="6" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="21" y1="20" x2="21" y2="25" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const NewYorkIcon = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20L10 14L14 17L24 7" stroke="#F77F00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 7H24V13" stroke="#F77F00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="4" y1="24" x2="24" y2="24" stroke="#F77F00" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);

const AsiaIcon = () => (
  <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="10" x2="24" y2="10" stroke="#2EC4B6" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
    <line x1="4" y1="18" x2="24" y2="18" stroke="#2EC4B6" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
    <path d="M6 14H10L12 12L14 16L16 13L18 15L20 14H22" stroke="#2EC4B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="3" y="9" width="2" height="10" rx="1" fill="#2EC4B6" fillOpacity="0.3"/>
    <rect x="23" y="9" width="2" height="10" rx="1" fill="#2EC4B6" fillOpacity="0.3"/>
  </svg>
);

const sessionConfig = {
  london: {
    title: 'London Session',
    subtitle: 'Live analysis and execution during London market hours.',
    Icon: LondonIcon,
    color: 'bg-[#F4D35E]/10 text-[#F4D35E]',
    webinars: londonWebinars
  },
  newyork: {
    title: 'New York Session',
    subtitle: 'Live futures and forex sessions during NY open.',
    Icon: NewYorkIcon,
    color: 'bg-[#F77F00]/10 text-[#F77F00]',
    webinars: nyWebinars
  },
  asia: {
    title: 'Asia Session',
    subtitle: 'Strategy discussion and trading during Asian liquidity.',
    Icon: AsiaIcon,
    color: 'bg-[#2EC4B6]/10 text-[#2EC4B6]',
    webinars: asiaWebinars
  }
};

export default function Webinars() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-success/20 text-success border-success/30';
      case 'Intermediate': return 'bg-warning/20 text-warning border-warning/30';
      case 'Advanced': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleSetAlert = (webinar: Webinar) => {
    toast({
      title: "Alert Set",
      description: `You'll be notified when "${webinar.title}" goes live.`
    });
  };

  const handleAddToWatchlist = (webinar: Webinar) => {
    toast({
      title: "Added to Watchlist",
      description: `"${webinar.title}" has been added to your watchlist.`
    });
  };

  // Landing Page View
  if (viewMode === 'landing') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <AppHeader title="Webinars" />
        
        <div className="flex-1 overflow-y-auto p-6">
          {/* Page Header - Centered */}
          <div className="text-center max-w-2xl mx-auto mb-16 pt-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-foreground mb-3">Webinars</h1>
            <p className="text-muted-foreground text-lg">
              Live trading sessions streamed by trusted traders and educators.
            </p>
          </div>

          {/* Session Category Cards Grid */}
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* London Session */}
            <Card 
              className="bg-card border-border hover:border-[#F4D35E]/50 transition-all duration-200 cursor-pointer group animate-fade-in"
              style={{ animationDelay: '0.1s' }}
              onClick={() => setViewMode('london')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#F4D35E]/10 flex items-center justify-center mb-6 group-hover:bg-[#F4D35E]/20 transition-colors">
                  {/* Candlestick cluster icon */}
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="8" width="4" height="12" rx="1" fill="#F4D35E" fillOpacity="0.9"/>
                    <line x1="7" y1="4" x2="7" y2="8" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="7" y1="20" x2="7" y2="24" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
                    <rect x="12" y="10" width="4" height="8" rx="1" stroke="#F4D35E" strokeWidth="1.5"/>
                    <line x1="14" y1="6" x2="14" y2="10" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="14" y1="18" x2="14" y2="22" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
                    <rect x="19" y="6" width="4" height="14" rx="1" fill="#F4D35E" fillOpacity="0.9"/>
                    <line x1="21" y1="3" x2="21" y2="6" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="21" y1="20" x2="21" y2="25" stroke="#F4D35E" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">London Session</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Live analysis and execution during London market hours.
                </p>
                <Button className="w-full group-hover:bg-primary/90">
                  View Live Schedule
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* New York Session */}
            <Card 
              className="bg-card border-border hover:border-[#F77F00]/50 transition-all duration-200 cursor-pointer group animate-fade-in"
              style={{ animationDelay: '0.2s' }}
              onClick={() => setViewMode('newyork')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#F77F00]/10 flex items-center justify-center mb-6 group-hover:bg-[#F77F00]/20 transition-colors">
                  {/* Upward trend arrow with line graph */}
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 20L10 14L14 17L24 7" stroke="#F77F00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 7H24V13" stroke="#F77F00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="4" y1="24" x2="24" y2="24" stroke="#F77F00" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">New York Session</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Live futures and forex sessions during NY open.
                </p>
                <Button className="w-full group-hover:bg-primary/90">
                  View Live Schedule
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Asia Session */}
            <Card 
              className="bg-card border-border hover:border-[#2EC4B6]/50 transition-all duration-200 cursor-pointer group animate-fade-in"
              style={{ animationDelay: '0.3s' }}
              onClick={() => setViewMode('asia')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#2EC4B6]/10 flex items-center justify-center mb-6 group-hover:bg-[#2EC4B6]/20 transition-colors">
                  {/* Horizontal price range / consolidation icon */}
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="4" y1="10" x2="24" y2="10" stroke="#2EC4B6" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
                    <line x1="4" y1="18" x2="24" y2="18" stroke="#2EC4B6" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
                    <path d="M6 14H10L12 12L14 16L16 13L18 15L20 14H22" stroke="#2EC4B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3" y="9" width="2" height="10" rx="1" fill="#2EC4B6" fillOpacity="0.3"/>
                    <rect x="23" y="9" width="2" height="10" rx="1" fill="#2EC4B6" fillOpacity="0.3"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Asia Session</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Strategy discussion and trading during Asian liquidity.
                </p>
                <Button className="w-full group-hover:bg-primary/90">
                  View Live Schedule
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Session Detail View
  const sessionKey = viewMode as 'london' | 'newyork' | 'asia';
  const currentSession = sessionConfig[sessionKey];
  
  if (!currentSession) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AppHeader title="Webinars" />
      
      <div className="flex-1 overflow-y-auto p-6">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4 mb-6 animate-fade-in">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode('landing')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
              <currentSession.Icon />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{currentSession.title}</h1>
              <p className="text-sm text-muted-foreground">
                {currentSession.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Webinars */}
        <div className="max-w-4xl">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Today's Live Sessions
          </h2>

          <div className="space-y-4">
            {currentSession.webinars.map((webinar, index) => (
              <Card 
                key={webinar.id}
                className="bg-card border-border hover:border-primary/50 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left - Main Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {webinar.isLive ? (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">
                            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                            LIVE
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {webinar.startTime}
                          </Badge>
                        )}
                        <Badge variant="outline" className={getLevelColor(webinar.level)}>
                          {webinar.level}
                        </Badge>
                        {webinar.isLive && webinar.viewers && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {webinar.viewers} watching
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-foreground mb-1">{webinar.title}</h3>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {webinar.host}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {webinar.assetFocus}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {webinar.duration}
                        </span>
                      </div>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex items-center gap-2">
                      {webinar.isLive ? (
                        <Button className="gap-2 bg-destructive hover:bg-destructive/90">
                          <Play className="h-4 w-4" />
                          Watch Live
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSetAlert(webinar)}
                            className="gap-1"
                          >
                            <Bell className="h-4 w-4" />
                            Set Alert
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleAddToWatchlist(webinar)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Past Sessions Placeholder */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Play className="h-4 w-4" />
              Past Sessions & Replays
            </h3>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Replay library coming soon. Past sessions will be available here for review.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}