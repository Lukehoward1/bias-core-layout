import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RiskTools() {
  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Risk Tools" />
      
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Position Size Calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pair" className="text-sm">Currency Pair</Label>
                    <Select defaultValue="eurusd">
                      <SelectTrigger id="pair" className="h-9">
                        <SelectValue placeholder="Select pair" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eurusd">EURUSD</SelectItem>
                        <SelectItem value="gbpusd">GBPUSD</SelectItem>
                        <SelectItem value="usdjpy">USDJPY</SelectItem>
                        <SelectItem value="xauusd">XAUUSD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account" className="text-sm">Account Size ($)</Label>
                    <Input id="account" type="number" defaultValue="10000" className="h-9" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="risk" className="text-sm">Risk % per Trade</Label>
                    <Input id="risk" type="number" defaultValue="2" step="0.1" className="h-9" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entry" className="text-sm">Entry Price</Label>
                    <Input id="entry" type="number" defaultValue="1.0850" step="0.0001" className="h-9" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stop" className="text-sm">Stop Loss</Label>
                    <Input id="stop" type="number" defaultValue="1.0820" step="0.0001" className="h-9" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target" className="text-sm">Take Profit</Label>
                    <Input id="target" type="number" defaultValue="1.0910" step="0.0001" className="h-9" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leverage" className="text-sm">Leverage</Label>
                    <Select defaultValue="100">
                      <SelectTrigger id="leverage" className="h-9">
                        <SelectValue placeholder="Select leverage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">1:30</SelectItem>
                        <SelectItem value="50">1:50</SelectItem>
                        <SelectItem value="100">1:100</SelectItem>
                        <SelectItem value="200">1:200</SelectItem>
                        <SelectItem value="500">1:500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full h-9 mt-2">Calculate</Button>
                </div>

                <div className="space-y-4">
                  <div className="p-5 bg-muted/50 rounded-lg border border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Results</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Position Size</span>
                        <span className="text-lg font-bold text-foreground">6.67 lots</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Risk Amount</span>
                        <span className="text-lg font-bold text-destructive">$200</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Reward Amount</span>
                        <span className="text-lg font-bold text-success">$400</span>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-border">
                        <span className="text-sm text-muted-foreground">Reward:Risk Ratio</span>
                        <span className="text-xl font-bold text-primary">2.00</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Stop Loss (pips)</span>
                        <span className="text-sm font-medium text-foreground">30</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Take Profit (pips)</span>
                        <span className="text-sm font-medium text-foreground">60</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">Tip:</span> A 2:1 reward-to-risk ratio is considered good practice for swing trading.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-medium text-sm text-foreground mb-1">Conservative</h3>
                      <p className="text-xl font-bold text-foreground mb-1">0.5-1%</p>
                      <p className="text-xs text-muted-foreground">Risk per trade for capital preservation</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-medium text-sm text-foreground mb-1">Moderate</h3>
                      <p className="text-xl font-bold text-foreground mb-1">1-2%</p>
                      <p className="text-xs text-muted-foreground">Balanced risk for steady growth</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-medium text-sm text-foreground mb-1">Aggressive</h3>
                      <p className="text-xl font-bold text-foreground mb-1">2-3%</p>
                      <p className="text-xs text-muted-foreground">Higher risk for faster returns</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Calculator (Linked to Account)</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Uses your connected account and current chart (coming soon)</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Account Info (Auto-detected)</h3>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Current Pair</span>
                      <span className="text-sm font-medium text-foreground">EURUSD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account Balance</span>
                      <span className="text-sm font-medium text-foreground">£10,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Current Price</span>
                      <span className="text-sm font-medium text-foreground">1.08450</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Spread</span>
                      <span className="text-sm font-medium text-foreground">0.8</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quick-risk" className="text-sm">Risk % per Trade</Label>
                    <Input id="quick-risk" type="number" defaultValue="2" step="0.1" className="h-9" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quick-stop" className="text-sm">Stop Size (pips)</Label>
                    <Input id="quick-stop" type="number" defaultValue="30" className="h-9" />
                  </div>

                  <Button className="w-full h-9">Calculate</Button>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="p-5 bg-muted/50 rounded-lg border border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Calculated Position</h3>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Lot Size</span>
                      <span className="text-2xl font-bold text-primary">0.67 lots</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Live linking to your broker account and open chart will be enabled in a future update.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
