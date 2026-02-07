import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getAssetBySymbol } from "@/data/assets";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
  Gauge,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromFilter = searchParams.get("from");

  const asset = symbol ? getAssetBySymbol(symbol) : undefined;

  if (!asset) {
    return (
      <div className="p-6 space-y-6">
        <AppHeader title="Asset Detail" />
        <div className="max-w-7xl mx-auto text-center py-20">
          <h2 className="text-2xl font-bold text-foreground mb-2">Asset not found</h2>
          <p className="text-muted-foreground mb-6">Symbol not available.</p>
          <Button variant="outline" onClick={() => navigate("/markets")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Markets
          </Button>
        </div>
      </div>
    );
  }

  const getBiasIcon = (bias: string) => {
    if (bias === "Bullish") return <TrendingUp className="h-5 w-5" />;
    if (bias === "Bearish") return <TrendingDown className="h-5 w-5" />;
    return <Minus className="h-5 w-5" />;
  };

  const getBiasColor = (bias: string) => {
    if (bias === "Bullish") return "text-success";
    if (bias === "Bearish") return "text-destructive";
    return "text-muted-foreground";
  };

  const sentimentPercent = Math.abs(asset.sentiment);
  const sentimentLabel = asset.sentiment > 0 ? "Bullish" : asset.sentiment < 0 ? "Bearish" : "Neutral";

  const handleBack = () => {
    if (fromFilter) {
      navigate(`/markets?filter=${fromFilter}`);
    } else {
      navigate(-1);
    }
  };

  const keyLevels = [
    { label: "Resistance 2", value: "\u2014", type: "resistance" },
    { label: "Resistance 1", value: "\u2014", type: "resistance" },
    { label: "Pivot", value: "\u2014", type: "pivot" },
    { label: "Support 1", value: "\u2014", type: "support" },
    { label: "Support 2", value: "\u2014", type: "support" },
  ];

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-8 space-y-5 border-b lg:border-b-0 lg:border-r border-border">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">{asset.displayName}</h1>
                  <Badge variant="outline">{asset.category}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-foreground">{asset.latestPrice}</span>
                  <span className={cn("text-lg font-semibold", asset.priceChange.startsWith("+") ? "text-success" : "text-destructive")}>
                    {asset.priceChange}
                  </span>
                </div>
              </div>

              {asset.insight && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Insights</h3>
                  <p className="text-sm text-foreground">{asset.insight}</p>
                </div>
              )}

              {asset.news && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">News Impact</h3>
                  <Badge
                    variant={asset.news.toLowerCase().includes("high impact") ? "destructive" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => navigate("/alerts")}
                  >
                    {asset.news}
                  </Badge>
                </div>
              )}
            </div>

            <div className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase">Volume</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">{asset.volume}</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase">Spread</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">{asset.spread}</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase">Confidence</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">{asset.biasConfidence}%</span>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase">Sentiment</span>
                  </div>
                  <span className={cn("text-xl font-bold", asset.sentiment > 0 ? "text-success" : asset.sentiment < 0 ? "text-destructive" : "text-muted-foreground")}>
                    {sentimentLabel} ({sentimentPercent})
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-6 border border-border/50 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Bias Direction</div>
                <div className={cn("flex items-center justify-center gap-3 text-2xl font-bold", getBiasColor(asset.biasDirection))}>
                  {getBiasIcon(asset.biasDirection)}
                  {asset.biasDirection}
                </div>
                <div className="mt-3 w-full bg-muted rounded-full h-2 relative">
                  <div className="absolute left-1/2 top-0 w-px h-2 bg-border" />
                  <div
                    className={cn("rounded-full h-2 transition-all", asset.sentiment > 0 ? "bg-success" : "bg-destructive")}
                    style={{
                      width: `${sentimentPercent / 2}%`,
                      marginLeft: asset.sentiment > 0 ? "50%" : `${50 - sentimentPercent / 2}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Key Levels</h3>
          <div className="space-y-2">
            {keyLevels.map((level) => (
              <div key={level.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className={cn("text-sm font-medium", level.type === "resistance" ? "text-destructive" : level.type === "support" ? "text-success" : "text-muted-foreground")}>
                  {level.label}
                </span>
                <span className="text-sm text-muted-foreground">{level.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
