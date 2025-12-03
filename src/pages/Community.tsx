import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Eye, TrendingUp } from "lucide-react";

const ideas = [
  { title: 'EURUSD Long Setup - Bullish Reversal', author: 'TradePro', tags: ['EURUSD', 'Long'], likes: 124, comments: 18, views: 2340 },
  { title: 'Gold Breaking Key Resistance', author: 'GoldBull', tags: ['XAUUSD', 'Gold'], likes: 98, comments: 15, views: 1890 },
  { title: 'GBP Weakness Analysis', author: 'ForexMaster', tags: ['GBPUSD', 'Short'], likes: 87, comments: 12, views: 1650 },
  { title: 'USD Strength into NFP', author: 'NewsTrader', tags: ['USD', 'News'], likes: 156, comments: 24, views: 3120 },
  { title: 'JPY Pairs Setup for Monday', author: 'AsiaSession', tags: ['USDJPY', 'Long'], likes: 72, comments: 9, views: 1450 },
  { title: 'Multi-Timeframe EURUSD Analysis', author: 'ChartWizard', tags: ['EURUSD', 'Analysis'], likes: 143, comments: 21, views: 2890 },
];

export default function Community() {
  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Community" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {ideas.map((idea, i) => (
                  <Card key={i} className="hover:shadow-lg transition-all cursor-pointer group">
                    <CardHeader className="pb-3">
                      <div className="h-28 bg-muted/50 rounded-lg mb-3 flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
                        <TrendingUp className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-sm line-clamp-2">{idea.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">by {idea.author}</p>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {idea.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          <span>{idea.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{idea.comments}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{idea.views}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trending Ideas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['EURUSD Breakout Setup', 'Gold at Key Level', 'USD Strength Analysis'].map((title, i) => (
                    <div key={i} className="p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                      <div className="text-sm font-medium text-foreground mb-1">{title}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        <span>{150 - i * 20}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Featured Traders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['TradePro', 'ForexMaster', 'ChartWizard'].map((trader, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {trader.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{trader}</span>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs">Follow</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Community Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Share quality trading ideas</li>
                    <li>• Respect all community members</li>
                    <li>• No spam or promotional content</li>
                    <li>• Provide constructive feedback</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
