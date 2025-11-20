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
    <div className="flex flex-col h-full">
      <AppHeader title="Risk Tools" />
      
      <div className="flex-1 overflow-y-auto bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Position Size Calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pair">Currency Pair</Label>
                    <Select defaultValue="eurusd">
                      <SelectTrigger id="pair">
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

                  <div>
                    <Label htmlFor="account">Account Size ($)</Label>
                    <Input id="account" type="number" defaultValue="10000" />
                  </div>

                  <div>
                    <Label htmlFor="risk">Risk % per Trade</Label>
                    <Input id="risk" type="number" defaultValue="2" step="0.1" />
                  </div>

                  <div>
                    <Label htmlFor="entry">Entry Price</Label>
                    <Input id="entry" type="number" defaultValue="1.0850" step="0.0001" />
                  </div>

                  <div>
                    <Label htmlFor="stop">Stop Loss</Label>
                    <Input id="stop" type="number" defaultValue="1.0820" step="0.0001" />
                  </div>

                  <div>
                    <Label htmlFor="target">Take Profit</Label>
                    <Input id="target" type="number" defaultValue="1.0910" step="0.0001" />
                  </div>

                  <Button className="w-full">Calculate</Button>
                </div>

                <div className="space-y-4">
                  <div className="p-6 bg-muted/50 rounded-lg border border-border">
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
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Risk Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Conservative</h3>
                  <p className="text-2xl font-bold text-foreground mb-1">0.5-1%</p>
                  <p className="text-xs text-muted-foreground">Risk per trade for capital preservation</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Moderate</h3>
                  <p className="text-2xl font-bold text-foreground mb-1">1-2%</p>
                  <p className="text-xs text-muted-foreground">Balanced risk for steady growth</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Aggressive</h3>
                  <p className="text-2xl font-bold text-foreground mb-1">2-3%</p>
                  <p className="text-xs text-muted-foreground">Higher risk for faster returns</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
