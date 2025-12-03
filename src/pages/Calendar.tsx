import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

const keyEvents = [
  { time: '08:30', currency: 'USD', event: 'Non-Farm Payrolls', impact: 'high' },
  { time: '10:00', currency: 'EUR', event: 'ECB Interest Rate Decision', impact: 'high' },
  { time: '14:00', currency: 'GBP', event: 'BOE Interest Rate Decision', impact: 'high' },
];

const events = [
  { time: '08:30', currency: 'USD', event: 'Non-Farm Payrolls', previous: '180K', forecast: '190K', actual: '—', impact: 'high' },
  { time: '08:30', currency: 'USD', event: 'Unemployment Rate', previous: '3.9%', forecast: '3.9%', actual: '—', impact: 'high' },
  { time: '09:00', currency: 'EUR', event: 'German Factory Orders', previous: '-0.2%', forecast: '0.5%', actual: '—', impact: 'medium' },
  { time: '10:00', currency: 'EUR', event: 'ECB Interest Rate Decision', previous: '4.50%', forecast: '4.50%', actual: '—', impact: 'high' },
  { time: '12:30', currency: 'CAD', event: 'Employment Change', previous: '42.0K', forecast: '25.0K', actual: '—', impact: 'medium' },
  { time: '14:00', currency: 'GBP', event: 'BOE Interest Rate Decision', previous: '5.25%', forecast: '5.25%', actual: '—', impact: 'high' },
];

export default function Calendar() {
  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'destructive';
    if (impact === 'medium') return 'default';
    return 'secondary';
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Calendar" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <Select defaultValue="today">
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="all">
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Impact</SelectItem>
                    <SelectItem value="high">High Impact</SelectItem>
                    <SelectItem value="medium">Medium Impact</SelectItem>
                    <SelectItem value="low">Low Impact</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="all">
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                    <SelectItem value="gbp">GBP</SelectItem>
                    <SelectItem value="jpy">JPY</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Key Events */}
          <Card>
            <CardHeader>
              <CardTitle>Key Events Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {keyEvents.map((event, i) => (
                  <div key={i} className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={getImpactColor(event.impact)} className="text-xs">
                        {event.impact.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{event.time}</span>
                    </div>
                    <div className="font-semibold text-sm text-foreground mb-1">{event.currency}</div>
                    <div className="text-xs text-muted-foreground">{event.event}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Events Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-5">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Time</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Currency</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Event</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Previous</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Forecast</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Actual</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event, i) => (
                      <tr key={i} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-5 text-sm text-foreground">{event.time}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{event.currency}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground font-medium">{event.event}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{event.previous}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{event.forecast}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{event.actual}</td>
                        <td className="py-3 px-5">
                          <Badge variant={getImpactColor(event.impact)} className="text-xs">
                            {event.impact.toUpperCase()}
                          </Badge>
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
