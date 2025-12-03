import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Plus } from "lucide-react";

const news = [
  { title: 'Fed Signals Potential Rate Hold', currency: 'USD', time: '2h ago', sentiment: 'hawkish' },
  { title: 'ECB Minutes Show Divided Opinion', currency: 'EUR', time: '4h ago', sentiment: 'mixed' },
  { title: 'BOE Governor Speech Hints at Cut', currency: 'GBP', time: '5h ago', sentiment: 'dovish' },
  { title: 'China GDP Beats Expectations', currency: 'CNY', time: '6h ago', sentiment: 'positive' },
  { title: 'Oil Prices Surge on Supply Concerns', currency: 'USD', time: '7h ago', sentiment: 'positive' },
];

const sessions = [
  { name: 'Tokyo', status: 'open', time: 'Closes in 1:23:45' },
  { name: 'London', status: 'closed', time: 'Opens in 2:15:30' },
  { name: 'New York', status: 'closed', time: 'Opens in 5:45:12' },
];

const alerts = [
  { type: 'Price Alert', what: 'EURUSD > 1.0850', when: 'Ongoing', delivery: 'Push', status: 'active' },
  { type: 'News Alert', what: 'USD High Impact', when: 'Today 08:30', delivery: 'Email', status: 'pending' },
  { type: 'Session Timer', what: 'London Open', when: 'In 2h 15m', delivery: 'Push', status: 'active' },
];

export default function Alerts() {
  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Alerts" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top News</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {news.map((item, i) => (
                    <div key={i} className="p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground mb-2">{item.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{item.currency}</Badge>
                            <Badge 
                              variant={item.sentiment === 'hawkish' || item.sentiment === 'positive' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {item.sentiment}
                            </Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Timers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.name} className="p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-sm text-foreground">{session.name}</h3>
                        <Badge variant={session.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                          {session.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">{session.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>My Alerts & Timers</CardTitle>
              <Button size="sm" className="h-8">
                <Plus className="h-4 w-4 mr-2" />
                Add Alert
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-5">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">What</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">When</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Delivery</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, i) => (
                      <tr key={i} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-5 text-sm text-foreground">{alert.type}</td>
                        <td className="py-3 px-4 text-sm text-foreground font-medium">{alert.what}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{alert.when}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{alert.delivery}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={alert.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {alert.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-5">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
