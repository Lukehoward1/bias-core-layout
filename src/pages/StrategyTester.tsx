import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Unified teal accent color matching StreamBias theme
const ICON_COLOR = "#2EC4B6";

// Custom SVG Icons for each mode
const CandlestickIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="8" width="4" height="12" rx="1" fill={ICON_COLOR} fillOpacity="0.9"/>
    <line x1="7" y1="4" x2="7" y2="8" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="7" y1="20" x2="7" y2="24" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="12" y="10" width="4" height="8" rx="1" stroke={ICON_COLOR} strokeWidth="1.5"/>
    <line x1="14" y1="6" x2="14" y2="10" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="18" x2="14" y2="22" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="19" y="6" width="4" height="14" rx="1" fill={ICON_COLOR} fillOpacity="0.9"/>
    <line x1="21" y1="3" x2="21" y2="6" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="21" y1="20" x2="21" y2="25" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const TrendLineIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20L10 14L14 17L24 7" stroke={ICON_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 7H24V13" stroke={ICON_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="4" y1="24" x2="24" y2="24" stroke={ICON_COLOR} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 3L5 7V13C5 18.55 8.84 23.74 14 25C19.16 23.74 23 18.55 23 13V7L14 3Z" stroke={ICON_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 14L13 17L18 11" stroke={ICON_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function StrategyTester() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AppHeader title="Strategy Tester" />
      
      <div className="flex-1 overflow-y-auto p-6">
        {/* Page Header - Centered */}
        <div className="text-center max-w-2xl mx-auto mb-16 pt-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-3">Strategy Tester</h1>
          <p className="text-muted-foreground text-lg">
            Test and refine your strategies in three different ways.
          </p>
        </div>

        {/* Mode Category Cards Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Manual Backtesting */}
          <Card 
            className="bg-card border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group animate-fade-in"
            style={{ animationDelay: '0.1s' }}
            onClick={() => navigate('/strategy/manual')}
          >
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(46,196,182,0.15)] transition-all duration-300">
                <CandlestickIcon />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Manual Backtesting</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Replay charts, mark entries and exits, and review trades manually.
              </p>
              <Button className="w-full group-hover:bg-primary/90">
                Open Tester
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Automated Strategy Lab */}
          <Card 
            className="bg-card border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group animate-fade-in"
            style={{ animationDelay: '0.2s' }}
            onClick={() => navigate('/strategy/auto')}
          >
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(46,196,182,0.15)] transition-all duration-300">
                <TrendLineIcon />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Automated Strategy Lab</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Choose a strategy, markets and date range, then auto-run a backtest.
              </p>
              <Button className="w-full group-hover:bg-primary/90">
                Configure Auto Test
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Funding Challenge Simulator */}
          <Card 
            className="bg-card border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group animate-fade-in"
            style={{ animationDelay: '0.3s' }}
            onClick={() => navigate('/strategy/funding')}
          >
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(46,196,182,0.15)] transition-all duration-300">
                <ShieldIcon />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Funding Challenge Simulator</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Practice under prop-firm style rules: daily drawdown, max drawdown and profit targets.
              </p>
              <Button className="w-full group-hover:bg-primary/90">
                Set Challenge Rules
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
