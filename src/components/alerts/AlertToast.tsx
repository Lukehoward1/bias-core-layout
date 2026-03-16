import { useState, useEffect } from "react";
import { X, Bell, Clock, TrendingUp, AlertTriangle, Calendar, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertItem {
  id: string;
  type: 'session' | 'news' | 'bias' | 'exposure' | 'summary' | 'timer' | 'breaking';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  severity: 'info' | 'warning' | 'high';
  relatedAsset?: string;
}

interface AlertToastProps {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
  quietHours: boolean;
}

export function AlertToast({ alerts, onDismiss, onMarkRead, quietHours }: AlertToastProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Only show unread alerts, max 3
  const visibleAlerts = alerts
    .filter(a => !a.read && !dismissedIds.has(a.id))
    .slice(0, 3);

  // Auto-dismiss after 6-8 seconds unless hovered
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    
    visibleAlerts.forEach(alert => {
      if (hoveredId !== alert.id && !quietHours) {
        const timer = setTimeout(() => {
          setDismissedIds(prev => new Set([...prev, alert.id]));
        }, 6000 + Math.random() * 2000);
        timers.push(timer);
      }
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [visibleAlerts, hoveredId, quietHours]);

  // Don't render toasts during quiet hours (but alerts still go to inbox)
  if (quietHours || visibleAlerts.length === 0) return null;

  const getIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'session': return <Clock className="h-4 w-4" />;
      case 'news': return <Calendar className="h-4 w-4" />;
      case 'bias': return <TrendingUp className="h-4 w-4" />;
      case 'exposure': return <AlertTriangle className="h-4 w-4" />;
      case 'breaking': return <Radio className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityStyles = (severity: AlertItem['severity']) => {
    switch (severity) {
      case 'high': return 'border-destructive/50 bg-destructive/10';
      case 'warning': return 'border-warning/50 bg-warning/10';
      default: return 'border-border bg-card';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {visibleAlerts.map((alert, index) => (
        <div
          key={alert.id}
          className={cn(
            "p-3 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 cursor-pointer",
            getSeverityStyles(alert.severity),
            "animate-in slide-in-from-right-5 fade-in-0"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
          onMouseEnter={() => setHoveredId(alert.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => {
            onMarkRead(alert.id);
            setDismissedIds(prev => new Set([...prev, alert.id]));
          }}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-1.5 rounded-md",
              alert.severity === 'high' ? 'bg-destructive/20 text-destructive' :
              alert.severity === 'warning' ? 'bg-warning/20 text-warning' :
              'bg-primary/20 text-primary'
            )}>
              {getIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(alert.id);
                setDismissedIds(prev => new Set([...prev, alert.id]));
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
