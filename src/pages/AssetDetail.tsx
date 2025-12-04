import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  AlertTriangle,
  Clock,
  Target,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";

const assetsData: Record<string, {
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
}> = {
  'EURUSD': { name: 'EURUSD', type: 'FX', bias: 'Bullish', confidence: 85, sentiment: 72, change: '+0.45%', price: '1.08450', spread: '0.8', volume: '1.2M', news: 'Today 13:30 – USD CPI (High Impact)' },
  'GBPUSD': { name: 'GBPUSD', type: 'FX', bias: 'Bullish', confidence: 78, sentiment: 68, change: '+0.32%', price: '1.26520', spread: '1.2', volume: '980K', news: 'Today 14:00 – GBP Retail Sales' },
  'USDJPY': { name: 'USDJPY', type: 'FX', bias: 'Bearish', confidence: 82, sentiment: -65, change: '-0.28%', price: '148.250', spread: '0.9', volume: '1.5M', news: 'Tomorrow 08:00 – JPY GDP' },
  'XAUUSD': { name: 'XAUUSD', type: 'Commodities', bias: 'Bullish', confidence: 91, sentiment: 88, change: '+1.24%', price: '2025.50', spread: '2.5', volume: '850K', news: 'Today 15:30 – Gold Futures Report' },
  'BTCUSD': { name: 'BTCUSD', type: 'Crypto', bias: 'Bullish', confidence: 76, sentiment: 65, change: '+2.15%', price: '37245.00', spread: '15.0', volume: '2.3M', news: 'Today 12:00 – BTC ETF Decision' },
  'AUDUSD': { name: 'AUDUSD', type: 'FX', bias: 'Neutral', confidence: 45, sentiment: 12, change: '+0.05%', price: '0.65420', spread: '1.0', volume: '620K', news: 'Tomorrow 10:30 – AUD Employment' },
  'USDCAD': { name: 'USDCAD', type: 'FX', bias: 'Bearish', confidence: 73, sentiment: -58, change: '-0.18%', price: '1.35820', spread: '1.1', volume: '740K', news: 'Today 16:00 – CAD Inflation' },
  'SPX500': { name: 'SPX500', type: 'Indices', bias: 'Bullish', confidence: 80, sentiment: 70, change: '+0.85%', price: '4587.20', spread: '0.5', volume: '3.1M', news: 'Today 11:00 – US Market Open' },
  'ETHUSD': { name: 'ETHUSD', type: 'Crypto', bias: 'Neutral', confidence: 55, sentiment: 15, change: '+0.45%', price: '2045.30', spread: '8.0', volume: '1.8M', news: 'Today 18:00 – ETH Network Update' },
};

const quickInsights: Record<string, string[]> = {
  'XAUUSD': [
    'Bias: Bullish → approaching resistance at 2035',
    'Level: Price near D1 support 2018–2022',
    'Trend: H4 structure remains bullish',
    'Volatility: High-impact USD news in 2 hours'
  ],
  'EURUSD': [
    'Bias: Bullish → testing 1.0850 resistance',
    'Level: Price above D1 support 1.0820',
    'Trend: H4 bullish momentum increasing',
    'Volatility: CPI data expected today'
  ],
  'BTCUSD': [
    'Bias: Bullish → ETF decision pending',
    'Level: Price consolidating near 37,000',
    'Trend: Weekly structure bullish',
    'Volatility: High due to regulatory news'
  ],
};

// Asset-specific news events for today
const assetNewsEvents: Record<string, { event: string; time: string; impact: 'High' | 'Medium' | 'Low' }[]> = {
  'EURUSD': [
    { event: 'CPI (USD)', time: '13:30 GMT', impact: 'High' },
    { event: 'Core CPI (USD)', time: '15:00 GMT', impact: 'High' },
  ],
  'GBPUSD': [
    { event: 'Retail Sales (GBP)', time: '14:00 GMT', impact: 'Medium' },
    { event: 'CPI (USD)', time: '13:30 GMT', impact: 'High' },
  ],
  'USDJPY': [],
  'XAUUSD': [
    { event: 'CPI (USD)', time: '13:30 GMT', impact: 'High' },
    { event: 'Gold Futures Report', time: '15:30 GMT', impact: 'Medium' },
  ],
  'BTCUSD': [
    { event: 'BTC ETF Decision', time: '12:00 GMT', impact: 'High' },
  ],
  'AUDUSD': [],
  'USDCAD': [
    { event: 'CAD Inflation', time: '16:00 GMT', impact: 'High' },
    { event: 'CPI (USD)', time: '13:30 GMT', impact: 'High' },
  ],
  'SPX500': [
    { event: 'US Market Open', time: '14:30 GMT', impact: 'Low' },
    { event: 'CPI (USD)', time: '13:30 GMT', impact: 'High' },
  ],
  'ETHUSD': [
    { event: 'ETH Network Update', time: '18:00 GMT', impact: 'Medium' },
  ],
};

const keyLevels = [
  { type: 'Daily Support', price: '2018.5', notes: 'Retest zone' },
  { type: 'Daily Resistance', price: '2035.0', notes: 'Liquidity overhead' },
  { type: 'Weekly Support', price: '2000.0', notes: 'Major level' },
  { type: 'Trendline', price: '—', notes: 'Uptrend intact' },
];

const upcomingNews = [
  { time: '13:30', event: 'USD CPI m/m', impact: 'High', forecast: '0.3%', previous: '0.2%', actual: '—' },
  { time: '15:00', event: 'USD Core CPI y/y', impact: 'High', forecast: '3.8%', previous: '3.9%', actual: '—' },
  { time: '15:30', event: 'USD Unemployment Claims', impact: 'Medium', forecast: '220K', previous: '218K', actual: '—' },
];

const sessionInsights = [
  { session: 'London Open', volatility: 'High', description: 'Strong directional moves expected' },
  { session: 'New York Open', volatility: 'Medium', description: 'Continuation or reversal likely' },
  { session: 'Asia', volatility: 'Low', description: 'Consolidation phase typical' },
];

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  const returnFilter = searchParams.get('from') || 'All';

  const asset = symbol ? assetsData[symbol] : null;

  useEffect(() => {
    if (symbol) {
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      setIsWatchlisted(watchlist.includes(symbol));
    }
  }, [symbol]);

  const toggleWatchlist = () => {
    if (!symbol) return;
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (isWatchlisted) {
      const updated = watchlist.filter((s: string) => s !== symbol);
      localStorage.setItem('watchlist', JSON.stringify(updated));
    } else {
      watchlist.push(symbol);
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }
    setIsWatchlisted(!isWatchlisted);
  };

  const handleBack = () => {
    navigate(`/markets?filter=${returnFilter}`);
  };

  if (!asset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Asset not found</h1>
          <Button onClick={() => navigate('/markets')}>Back to Markets</Button>
        </div>
      </div>
    );
  }

  const getBiasColor = (bias: string) => {
    if (bias === 'Bullish') return 'text-success';
    if (bias === 'Bearish') return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getBiasIcon = (bias: string) => {
    if (bias === 'Bullish') return <TrendingUp className="h-6 w-6" />;
    if (bias === 'Bearish') return <TrendingDown className="h-6 w-6" />;
    return <Minus className="h-6 w-6" />;
  };

  const insights = quickInsights[symbol || ''] || [
    `Bias: ${asset.bias} → monitoring key levels`,
    'Level: Price near significant support/resistance',
    'Trend: Structure developing on H4',
    'Volatility: Watch for upcoming news events'
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Markets
          </Button>
          <Badge variant="outline" className="text-xs">Live Data</Badge>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* UNIFIED HERO CARD */}
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* LEFT SIDE (50%) */}
              <div className="flex flex-col">
                {/* Asset Name */}
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-4xl font-bold text-foreground">{asset.name}</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleWatchlist}
                    className="h-10 w-10"
                  >
                    <Star className={`h-6 w-6 ${isWatchlisted ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                </div>

                {/* Price + Change */}
                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-3xl font-semibold text-foreground">{asset.price}</span>
                  <span className={`text-lg font-medium ${asset.change.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                    {asset.change}
                  </span>
                </div>

                {/* Quick Insights */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick Insights</h3>
                  <div className="space-y-2">
                    {insights.map((insight, index) => {
                      const colors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-destructive'];
                      return (
                        <div key={index} className="flex items-start gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${colors[index % colors.length]} mt-1.5 flex-shrink-0`} />
                          <p className="text-sm text-muted-foreground">{insight}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* News Impact Section */}
                  {symbol && assetNewsEvents[symbol] && assetNewsEvents[symbol].length > 0 && (
                    <div className="mt-5">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">News Impact</h3>
                      <div className="space-y-2">
                        {assetNewsEvents[symbol].map((newsItem, index) => {
                          const impactColors = {
                            High: 'bg-destructive text-destructive-foreground',
                            Medium: 'bg-warning text-warning-foreground',
                            Low: 'bg-success text-success-foreground'
                          };
                          return (
                            <button
                              key={index}
                              onClick={() => navigate('/alerts')}
                              className="w-full flex items-center gap-2 text-left hover:bg-muted/30 rounded-md px-2 py-1.5 transition-colors group"
                            >
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${impactColors[newsItem.impact]}`}>
                                {newsItem.impact}
                              </span>
                              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                                {newsItem.event}
                              </span>
                              <span className="text-sm text-muted-foreground">—</span>
                              <span className="text-sm text-muted-foreground">{newsItem.time}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE (50%) */}
              <div className="flex flex-col">
                {/* Stats Row - 4 boxes */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Volume</span>
                    <span className="text-sm font-semibold text-foreground">{asset.volume}</span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Spread</span>
                    <span className="text-sm font-semibold text-foreground">{asset.spread}</span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Confidence</span>
                    <span className="text-sm font-semibold text-foreground">{asset.confidence}%</span>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <span className="text-xs text-muted-foreground block mb-1">Sentiment</span>
                    <span className={`text-sm font-semibold ${asset.sentiment > 0 ? 'text-success' : asset.sentiment < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {asset.sentiment > 0 ? '+' : ''}{asset.sentiment}
                    </span>
                  </div>
                </div>

                {/* Large Bias Gauge */}
                <div className="flex-1 flex flex-col items-center justify-center pt-2">
                  <span className="text-sm text-muted-foreground uppercase tracking-wide mb-6">Current Bias</span>
                  <div className="relative w-72 h-36">
                    <svg viewBox="0 0 100 50" className="w-full h-full">
                      {/* Background arc */}
                      <path
                        d="M 10 45 A 40 40 0 0 1 90 45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted"
                      />
                      {/* Filled arc */}
                      <path
                        d="M 10 45 A 40 40 0 0 1 90 45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${(asset.confidence / 100) * 126} 126`}
                        className={getBiasColor(asset.bias)}
                      />
                      {/* Needle */}
                      <line
                        x1="50"
                        y1="45"
                        x2={50 + 35 * Math.cos((Math.PI * (180 - asset.confidence * 1.8)) / 180)}
                        y2={45 - 35 * Math.sin((Math.PI * (180 - asset.confidence * 1.8)) / 180)}
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-foreground"
                      />
                      <circle cx="50" cy="45" r="5" fill="currentColor" className="text-foreground" />
                    </svg>
                  </div>
                  <div className={`flex items-center gap-2 mt-6 ${getBiasColor(asset.bias)}`}>
                    {getBiasIcon(asset.bias)}
                    <span className="text-3xl font-bold">{asset.bias}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* C) AI MARKET OVERVIEW */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              AI Market Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{asset.name}</strong> is currently showing a <strong className={getBiasColor(asset.bias)}>{asset.bias.toLowerCase()}</strong> bias 
                with {asset.confidence}% confidence based on our multi-timeframe analysis. On the weekly timeframe, 
                price remains above the key support zone, indicating underlying strength. The daily chart shows 
                consolidation near recent highs with potential for continuation.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                H4 structure maintains a series of higher highs and higher lows, supporting the current bias direction. 
                Key resistance overhead at the psychological level may act as a short-term ceiling. Current volatility 
                is elevated due to upcoming high-impact economic data, suggesting wider stops may be appropriate.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong className="text-foreground">Session Preference:</strong> London session showing strongest 
                directional moves historically for this pair. Consider reduced position sizing during Asian session 
                consolidation. Watch for potential reversals during NY session if key levels are tested.
              </p>
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    <strong>Warning:</strong> High-impact news events scheduled within the next 4 hours. 
                    Consider reducing exposure or waiting for data release before entering new positions.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* D) KEY LEVELS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Key Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Level Type</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyLevels.map((level, index) => (
                      <tr key={index} className="border-b border-border/50 last:border-0">
                        <td className="py-3 px-2 text-sm font-medium text-foreground">{level.type}</td>
                        <td className="py-3 px-2 text-sm text-foreground font-mono">{level.price}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">{level.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* F) SESSION PERFORMANCE INSIGHTS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Session Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessionInsights.map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                    <div>
                      <span className="font-medium text-foreground">{session.session}</span>
                      <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                    </div>
                    <Badge variant={
                      session.volatility === 'High' ? 'destructive' : 
                      session.volatility === 'Medium' ? 'default' : 'secondary'
                    }>
                      {session.volatility}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* E) RELEVANT NEWS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Upcoming High-Impact News
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Event</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Impact</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Forecast</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Previous</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingNews.map((news, index) => (
                    <tr key={index} className="border-b border-border/50 last:border-0">
                      <td className="py-3 px-2 text-sm font-medium text-foreground">{news.time}</td>
                      <td className="py-3 px-2 text-sm text-foreground">{news.event}</td>
                      <td className="py-3 px-2">
                        <Badge variant={news.impact === 'High' ? 'destructive' : 'secondary'} className="text-xs">
                          {news.impact}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground font-mono">{news.forecast}</td>
                      <td className="py-3 px-2 text-sm text-muted-foreground font-mono">{news.previous}</td>
                      <td className="py-3 px-2 text-sm text-muted-foreground font-mono">{news.actual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}