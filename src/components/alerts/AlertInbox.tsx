import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Inbox, 
  CheckCheck, 
  Clock, 
  Bell, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Radio,
  Trash2,
  Target,
  BarChart2,
  ShieldAlert
} from "lucide-react";
import type { AlertItem, AlertType } from "@/types/alerts";
import { cn } from "@/lib/utils";

interface AlertInboxProps {
  alerts: AlertItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function AlertInbox({ alerts, onMarkRead, onMarkAllRead, onDelete, onClearAll }: AlertInboxProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredAlerts = filter === 'unread' ? alerts.filter(a => !a.read) : alerts;
  const unreadCount = alerts.filter(a => !a.read).length;

  const getIcon = (type: AlertType) => {
    switch (type) {
      case 'session': return <Clock className="h-4 w-4" />;
      case 'news': return <Calendar className="h-4 w-4" />;
      case 'bias': return <TrendingUp className="h-4 w-4" />;
      case 'exposure': return <AlertTriangle className="h-4 w-4" />;
      case 'breaking': return <Radio className="h-4 w-4" />;
      case 'price': return <Target className="h-4 w-4" />;
      case 'level': return <BarChart2 className="h-4 w-4" />;
      case 'risk': return <ShieldAlert className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityStyles = (severity: AlertItem['severity'], read: boolean) => {
    if (read) return 'bg-muted/30 border-border/50';
    switch (severity) {
      case 'high': return 'bg-destructive/5 border-destructive/30';
      case 'warning': return 'bg-warning/5 border-warning/30';
      default: return 'bg-card border-border';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            Alert Inbox
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead} className="text-xs h-7">
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {alerts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs h-7 text-muted-foreground">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="all" className="text-xs">All ({alerts.length})</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Unread ({unreadCount})</TabsTrigger>
          </TabsList>
          
          <TabsContent value={filter} className="mt-0">
            <ScrollArea className="h-[400px] pr-4">
              {filteredAlerts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No alerts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                        getSeverityStyles(alert.severity, alert.read)
                      )}
                      onClick={() => onMarkRead(alert.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-1.5 rounded-md mt-0.5",
                          alert.severity === 'high' ? 'bg-destructive/20 text-destructive' :
                          alert.severity === 'warning' ? 'bg-warning/20 text-warning' :
                          'bg-primary/20 text-primary',
                          alert.read && 'opacity-50'
                        )}>
                          {getIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              alert.read ? 'text-muted-foreground' : 'text-foreground'
                            )}>
                              {alert.title}
                            </p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatTime(alert.timestamp)}
                            </span>
                          </div>
                          <p className={cn(
                            "text-xs line-clamp-2",
                            alert.read ? 'text-muted-foreground/70' : 'text-muted-foreground'
                          )}>
                            {alert.message}
                          </p>
                          {alert.relatedAsset && (
                            <Badge variant="secondary" className="mt-1.5 text-[10px]">
                              {alert.relatedAsset}
                            </Badge>
                          )}
                        </div>
                        {!alert.read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
