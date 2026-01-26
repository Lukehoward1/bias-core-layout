import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Bell, Clock, TrendingUp, AlertTriangle, Calendar, Radio, Target, BarChart2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlertsContext } from "@/contexts/AlertsContext";
import type { AlertType } from "@/types/alerts";

export function GlobalNotifications() {
  const navigate = useNavigate();
  const { alerts, dismissAlert, markRead, isQuietHours } = useAlertsContext();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Only show unread alerts, max 3
  const visibleAlerts = alerts
    .filter(a => !a.read && !dismissedIds.has(a.id))
    .slice(0, 3);

  // Auto-dismiss after 6-8 seconds unless hovered
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    visibleAlerts.forEach(alert => {
      if (hoveredId !== alert.id && !isQuietHours) {
        const timer = setTimeout(() => {
          setDismissedIds(prev => new Set([...prev, alert.id]));
        }, 6000 + Math.random() * 2000);
        timers.push(timer);
      }
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [visibleAlerts, hoveredId, isQuietHours]);

  // Don't render toasts during quiet hours (but alerts still go to inbox)
  if (isQuietHours || visibleAlerts.length === 0) return null;

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

  const getSeverityStyles = (severity: 'info' | 'warning' | 'high') => {
    switch (severity) {
      case 'high': return 'border-destructive/50 bg-destructive/10';
      case 'warning': return 'border-warning/50 bg-warning/10';
      default: return 'border-border bg-card';
    }
  };

  const handleAlertClick = (alert: typeof visibleAlerts[0]) => {
    markRead(alert.id);
    setDismissedIds(prev => new Set([...prev, alert.id]));
    
    // Click-through routing based on alert type and routeTo
    if (alert.routeTo) {
      // If there's an eventId, append it as query param for calendar deep-linking
      if (alert.eventId && alert.routeTo === '/calendar') {
        navigate(`/calendar?eventId=${encodeURIComponent(alert.eventId)}`);
        return;
      }
      navigate(alert.routeTo);
      return;
    }
    
    // Default routing based on type
    switch (alert.type) {
      case 'bias':
      case 'price':
      case 'level':
        if (alert.relatedAsset) {
          navigate(`/asset/${alert.relatedAsset}`);
        } else {
          navigate('/markets');
        }
        break;
      case 'news':
      case 'summary':
      case 'breaking':
        // Deep-link to specific event if eventId is present
        if (alert.eventId) {
          navigate(`/calendar?eventId=${encodeURIComponent(alert.eventId)}`);
        } else {
          navigate('/calendar');
        }
        break;
      case 'risk':
      case 'exposure':
        navigate('/risk-tools');
        break;
      case 'session':
        navigate('/alerts');
        break;
      default:
        navigate('/alerts');
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
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
          onClick={() => handleAlertClick(alert)}
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
                dismissAlert(alert.id);
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
