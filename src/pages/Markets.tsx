import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { useState } from "react";

type MarketType = 'All' | 'FX' | 'Crypto' | 'Indices' | 'Commodities' | 'ETFs' | 'Futures';

const pairs = [
  { name: 'EURUSD', type: 'FX', bias: 'Bullish', confidence: 85, sentiment: 72, change: '+0.45%', price: '1.08450', spread: '0.8', volume: '1.2M', news: 'Today 13:30 – USD CPI (High Impact)' },
  { name: 'GBPUSD', type: 'FX', bias: 'Bullish', confidence: 78, sentiment: 68, change: '+0.32%', price: '1.26520', spread: '1.2', volume: '980K', news: 'Today 14:00 – GBP Retail Sales' },
  { name: 'USDJPY', type: 'FX', bias: 'Bearish', confidence: 82, sentiment: -65, change: '-0.28%', price: '148.250', spread: '0.9', volume: '1.5M', news: 'Tomorrow 08:00 – JPY GDP' },
  { name: 'XAUUSD', type: 'Commodities', bias: 'Bullish', confidence: 91, sentiment: 88, change: '+1.24%', price: '2025.50', spread: '2.5', volume: '850K', news: 'Today 15:30 – Gold Futures Report' },
  { name: 'BTCUSD', type: 'Crypto', bias: 'Bullish', confidence: 76, sentiment: 65, change: '+2.15%', price: '37245.00', spread: '15.0', volume: '2.3M', news: 'Today 12:00 – BTC ETF Decision' },
  { name: 'AUDUSD', type: 'FX', bias: 'Neutral', confidence: 45, sentiment: 12, change: '+0.05%', price: '0.65420', spread: '1.0', volume: '620K', news: 'Tomorrow 10:30 – AUD Employment' },
  { name: 'USDCAD', type: 'FX', bias: 'Bearish', confidence: 73, sentiment: -58, change: '-0.18%', price: '1.35820', spread: '1.1', volume: '740K', news: 'Today 16:00 – CAD Inflation' },
  { name: 'SPX500', type: 'Indices', bias: 'Bullish', confidence: 80, sentiment: 70, change: '+0.85%', price: '4587.20', spread: '0.5', volume: '3.1M', news: 'Today 11:00 – US Market Open' },
  { name: 'ETHUSD', type: 'Crypto', bias: 'Neutral', confidence: 55, sentiment: 15, change: '+0.45%', price: '2045.30', spread: '8.0', volume: '1.8M', news: 'Today 18:00 – ETH Network Update' },
];

export default function Markets() {
  const [selectedType, setSelectedType] = useState<MarketType>('All');

  const marketTypes: MarketType[] = ['All', 'FX', 'Crypto', 'Indices', 'Commodities', 'ETFs', 'Futures'];

  const filteredPairs = selectedType === 'All' 
    ? pairs 
    : pairs.filter(pair => pair.type === selectedType);

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

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Markets" />
      
      <div className="flex-1 overflow-y-auto bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">Real-time market bias and sentiment analysis</p>
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
                className="rounded-full"
              >
                {type}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPairs.map((pair) => (
              <Card key={pair.name} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl">{pair.name}</CardTitle>
                    <div className={`flex items-center gap-1 ${getBiasColor(pair.bias)}`}>
                      {getBiasIcon(pair.bias)}
                      <span className="text-sm font-medium">{pair.bias}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">{pair.price}</span>
                    <span className={`text-sm font-medium ${pair.change.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                      {pair.change}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Spread</span>
                      <span className="font-medium text-foreground">{pair.spread}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Vol</span>
                      <span className="font-medium text-foreground">{pair.volume}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Confidence</span>
                      <span className="text-sm font-medium text-foreground">{pair.confidence}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary rounded-full h-2 transition-all" 
                        style={{ width: `${pair.confidence}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Sentiment</span>
                      <span className={`text-sm font-medium ${pair.sentiment > 0 ? 'text-success' : pair.sentiment < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {pair.sentiment > 0 ? '+' : ''}{pair.sentiment}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 relative">
                      <div className="absolute left-1/2 top-0 w-0.5 h-2 bg-border" />
                      <div 
                        className={`${pair.sentiment > 0 ? 'bg-success' : 'bg-destructive'} rounded-full h-2 transition-all`}
                        style={{ 
                          width: `${Math.abs(pair.sentiment) / 2}%`,
                          marginLeft: pair.sentiment > 0 ? '50%' : `${50 - Math.abs(pair.sentiment) / 2}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground line-clamp-2">{pair.news}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
