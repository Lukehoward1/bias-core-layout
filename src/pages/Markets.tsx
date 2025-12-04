import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Star,
  ChevronRight,
  Activity
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type MarketType = 'Watchlist' | 'All' | 'FX' | 'Crypto' | 'Indices' | 'Commodities' | 'ETFs' | 'Futures';

interface Pair {
  name: string;
  type: string;
  bias: string;
  confidence: number;
  sentiment: number;
  change: string;
  price: string;
  spread: string;
  volume: string;
  news: string;
  insight?: string;
}

const pairs: Pair[] = [
  { name: 'EURUSD', type: 'FX', bias: 'Bullish', confidence: 85, sentiment: 72, change: '+0.45%', price: '1.08450', spread: '0.8', volume: '1.2M', news: 'Today 13:30 – USD CPI (High Impact)', insight: 'Testing 1.0850 resistance level' },
  { name: 'GBPUSD', type: 'FX', bias: 'Bullish', confidence: 78, sentiment: 68, change: '+0.32%', price: '1.26520', spread: '1.2', volume: '980K', news: 'Today 14:00 – GBP Retail Sales', insight: 'Above D1 support, momentum building' },
  { name: 'USDJPY', type: 'FX', bias: 'Bearish', confidence: 82, sentiment: -65, change: '-0.28%', price: '148.250', spread: '0.9', volume: '1.5M', news: 'Tomorrow 08:00 – JPY GDP', insight: 'Rejection from 149.00 resistance' },
  { name: 'XAUUSD', type: 'Commodities', bias: 'Bullish', confidence: 91, sentiment: 88, change: '+1.24%', price: '2025.50', spread: '2.5', volume: '850K', news: 'Today 15:30 – Gold Futures Report', insight: 'Strong momentum toward 2035' },
  { name: 'BTCUSD', type: 'Crypto', bias: 'Bullish', confidence: 76, sentiment: 65, change: '+2.15%', price: '37245.00', spread: '15.0', volume: '2.3M', news: 'Today 12:00 – BTC ETF Decision', insight: 'Consolidating above 37K support' },
  { name: 'AUDUSD', type: 'FX', bias: 'Neutral', confidence: 45, sentiment: 12, change: '+0.05%', price: '0.65420', spread: '1.0', volume: '620K', news: 'Tomorrow 10:30 – AUD Employment', insight: 'Range-bound between 0.6500-0.6580' },
  { name: 'USDCAD', type: 'FX', bias: 'Bearish', confidence: 73, sentiment: -58, change: '-0.18%', price: '1.35820', spread: '1.1', volume: '740K', news: 'Today 16:00 – CAD Inflation', insight: 'Breakdown below 1.3600 support' },
  { name: 'SPX500', type: 'Indices', bias: 'Bullish', confidence: 80, sentiment: 70, change: '+0.85%', price: '4587.20', spread: '0.5', volume: '3.1M', news: 'Today 11:00 – US Market Open', insight: 'New highs, momentum continues' },
  { name: 'ETHUSD', type: 'Crypto', bias: 'Neutral', confidence: 55, sentiment: 15, change: '+0.45%', price: '2045.30', spread: '8.0', volume: '1.8M', news: 'Today 18:00 – ETH Network Update', insight: 'Awaiting network upgrade catalyst' },
];

export default function Markets() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filterParam = searchParams.get('filter') as MarketType | null;
  
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<MarketType>('All');

  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    const parsed = saved ? JSON.parse(saved) : [];
    setWatchlist(parsed);
    
    // Set default filter based on URL param or watchlist
    if (filterParam && ['Watchlist', 'All', 'FX', 'Crypto', 'Indices', 'Commodities', 'ETFs', 'Futures'].includes(filterParam)) {
      setSelectedType(filterParam);
    } else if (parsed.length > 0) {
      setSelectedType('Watchlist');
    }
  }, [filterParam]);

  const marketTypes: MarketType[] = ['Watchlist', 'All', 'FX', 'Crypto', 'Indices', 'Commodities', 'ETFs', 'Futures'];

  const toggleWatchlist = (pairName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = watchlist.includes(pairName)
      ? watchlist.filter(p => p !== pairName)
      : [...watchlist, pairName];
    setWatchlist(updated);
    localStorage.setItem('watchlist', JSON.stringify(updated));
  };

  const filteredPairs = selectedType === 'Watchlist'
    ? pairs.filter(pair => watchlist.includes(pair.name))
    : selectedType === 'All' 
      ? pairs 
      : pairs.filter(pair => pair.type === selectedType);

  const watchlistedPairs = pairs.filter(pair => watchlist.includes(pair.name));

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

  const openAssetDetail = (pairName: string) => {
    navigate(`/asset/${pairName}?from=${selectedType}`);
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Markets" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Real-time market bias and sentiment analysis</p>
            <Badge variant="outline" className="text-xs">Updated 2 mins ago</Badge>
          </div>

          {/* Market Type Filters */}
          <div className="flex flex-wrap gap-2">
            {marketTypes.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
                className={`rounded-full h-8 px-4 text-xs ${type === 'Watchlist' ? 'gap-1.5' : ''}`}
              >
                {type === 'Watchlist' && <Star className="h-3.5 w-3.5" />}
                {type}
                {type === 'Watchlist' && watchlist.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {watchlist.length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Watchlist Overview Bar */}
          {(selectedType === 'Watchlist' || selectedType === 'All') && watchlistedPairs.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-primary" />
                  My Watchlist Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {watchlistedPairs.map((pair) => (
                    <div 
                      key={pair.name}
                      onClick={() => openAssetDetail(pair.name)}
                      className="flex items-center gap-4 p-3 rounded-lg bg-background/50 hover:bg-background cursor-pointer transition-colors group"
                    >
                      <span className="font-semibold text-foreground min-w-[80px]">{pair.name}</span>
                      <div className={`flex items-center gap-1 min-w-[80px] ${getBiasColor(pair.bias)}`}>
                        {getBiasIcon(pair.bias)}
                        <span className="text-sm">{pair.bias}</span>
                      </div>
                      <span className="text-sm text-muted-foreground flex-1 truncate">{pair.insight}</span>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground hidden md:block">
                          <span className="mr-3">Vol: {pair.volume}</span>
                          <span>Spread: {pair.spread}</span>
                        </div>
                        {pair.news && (
                          <Badge variant="destructive" className="text-[10px] hidden lg:inline-flex">
                            News
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty Watchlist State */}
          {selectedType === 'Watchlist' && watchlistedPairs.length === 0 && (
            <Card className="bg-muted/30">
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Your watchlist is empty</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click the star icon on any asset card to add it to your watchlist
                </p>
                <Button variant="outline" onClick={() => setSelectedType('All')}>
                  Browse All Assets
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Asset Cards Grid */}
          {(selectedType !== 'Watchlist' || watchlistedPairs.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredPairs.map((pair) => (
                <Card 
                  key={pair.name} 
                  onClick={() => openAssetDetail(pair.name)}
                  className="hover:shadow-lg transition-shadow cursor-pointer group relative"
                >
                  {/* Watchlist Star */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => toggleWatchlist(pair.name, e)}
                    className="absolute top-3 right-3 h-8 w-8 z-10"
                  >
                    <Star className={`h-4 w-4 ${watchlist.includes(pair.name) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-foreground'}`} />
                  </Button>

                  <CardHeader className="pb-3 pr-12">
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-lg">{pair.name}</CardTitle>
                      <div className={`flex items-center gap-1.5 ${getBiasColor(pair.bias)}`}>
                        {getBiasIcon(pair.bias)}
                        <span className="text-sm font-medium">{pair.bias}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-foreground">{pair.price}</span>
                      <span className={`text-sm font-medium ${pair.change.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                        {pair.change}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-muted-foreground">Spread</span>
                        <span className="font-medium text-foreground">{pair.spread}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-muted-foreground">Vol</span>
                        <span className="font-medium text-foreground">{pair.volume}</span>
                      </div>
                    </div>

                    {/* Mini Sentiment Gauge */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">Sentiment</span>
                        <span className={`text-xs font-medium ${pair.sentiment > 0 ? 'text-success' : pair.sentiment < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {pair.sentiment > 0 ? '+' : ''}{pair.sentiment}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 relative">
                        <div className="absolute left-1/2 top-0 w-px h-1.5 bg-border" />
                        <div 
                          className={`${pair.sentiment > 0 ? 'bg-success' : 'bg-destructive'} rounded-full h-1.5 transition-all`}
                          style={{ 
                            width: `${Math.abs(pair.sentiment) / 2}%`,
                            marginLeft: pair.sentiment > 0 ? '50%' : `${50 - Math.abs(pair.sentiment) / 2}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* High Impact News Badge */}
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground line-clamp-1">{pair.news}</p>
                        </div>
                        {pair.news.toLowerCase().includes('high impact') && (
                          <Badge variant="destructive" className="text-[10px] flex-shrink-0">
                            High
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}