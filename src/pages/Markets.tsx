import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const pairs = [
  { name: 'EURUSD', bias: 'Bullish', confidence: 85, sentiment: 72, change: '+0.45%' },
  { name: 'GBPUSD', bias: 'Bullish', confidence: 78, sentiment: 68, change: '+0.32%' },
  { name: 'USDJPY', bias: 'Bearish', confidence: 82, sentiment: -65, change: '-0.28%' },
  { name: 'XAUUSD', bias: 'Bullish', confidence: 91, sentiment: 88, change: '+1.24%' },
  { name: 'AUDUSD', bias: 'Neutral', confidence: 45, sentiment: 12, change: '+0.05%' },
  { name: 'USDCAD', bias: 'Bearish', confidence: 73, sentiment: -58, change: '-0.18%' },
];

export default function Markets() {
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
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Real-time market bias and sentiment analysis</p>
            <Badge variant="outline" className="text-xs">Updated 2 mins ago</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pairs.map((pair) => (
              <Card key={pair.name} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{pair.name}</CardTitle>
                    <div className={`flex items-center gap-1 ${getBiasColor(pair.bias)}`}>
                      {getBiasIcon(pair.bias)}
                      <span className="text-sm font-medium">{pair.bias}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Change</span>
                    <span className={`text-sm font-medium ${pair.change.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                      {pair.change}
                    </span>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
