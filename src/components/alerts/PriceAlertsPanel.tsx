import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, Plus, Trash2, ArrowUp, ArrowDown, CheckCircle2, Clock, RotateCcw, Undo2, Pencil } from "lucide-react";
import { useAlertsContext } from "@/contexts/AlertsContext";
import { CreatePriceAlertModal } from "./CreatePriceAlertModal";
import { cn } from "@/lib/utils";
import type { PriceAlert } from "@/types/alerts";

const getTriggerLabel = (alert: PriceAlert) => {
  return alert.triggerType === "wick" ? "Price touch" : `${alert.timeframe} candle close`;
};

const getConditionLabel = (alert: PriceAlert) => {
  return alert.direction === "above" ? `Tests above ${alert.price}` : `Tests below ${alert.price}`;
};

const getContextLabel = (alert: PriceAlert) => {
  if (alert.triggerType === "wick") {
    return alert.direction === "above"
      ? "Notify when price touches or sweeps this upper level."
      : "Notify when price touches or sweeps this lower level.";
  }

  return alert.direction === "above"
    ? `Notify only if price closes above this level on ${alert.timeframe}.`
    : `Notify only if price closes below this level on ${alert.timeframe}.`;
};

export function PriceAlertsPanel() {
  const { priceAlerts, togglePriceAlert, deletePriceAlert, updatePriceAlert } = useAlertsContext();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);

  const activeAlerts = useMemo(() => priceAlerts.filter((alert) => !alert.triggered), [priceAlerts]);
  const triggeredAlerts = useMemo(() => priceAlerts.filter((alert) => alert.triggered), [priceAlerts]);

  const formatTime = (date: Date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Recently";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const openCreateModal = useCallback(() => {
    setEditingAlert(null);
    setShowCreateModal(true);
  }, []);

  const openEditModal = useCallback((alert: PriceAlert) => {
    setEditingAlert(alert);
    setShowCreateModal(true);
  }, []);

  const handleModalOpenChange = useCallback((open: boolean) => {
    setShowCreateModal(open);
    if (!open) {
      setEditingAlert(null);
    }
  }, []);

  const restoreAlert = useCallback(
    (id: string) => {
      updatePriceAlert(id, {
        triggered: false,
        enabled: true,
        triggeredAt: undefined,
      });
    },
    [updatePriceAlert],
  );

  const resetHistory = useCallback(() => {
    triggeredAlerts.forEach((alert) => {
      updatePriceAlert(alert.id, {
        triggered: false,
        enabled: true,
        triggeredAt: undefined,
      });
    });
  }, [triggeredAlerts, updatePriceAlert]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Custom Price Alerts
          </CardTitle>

          <div className="flex items-center gap-2">
            {triggeredAlerts.length > 0 && (
              <Button variant="outline" size="sm" className="h-8" onClick={resetHistory}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset History
              </Button>
            )}

            <Button size="sm" className="h-8" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1" />
              New Alert
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Active ({activeAlerts.length})
            </h4>

            <ScrollArea className="h-[220px]">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active price alerts</p>
                  <p className="text-xs mt-1">Create one to track a key level or candle close</p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        alert.enabled ? "bg-card border-border" : "bg-muted/30 border-border/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {alert.direction === "above" ? (
                            <ArrowUp className="h-4 w-4 text-success mt-0.5 shrink-0" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-sm truncate">{alert.assetDisplayName}</span>

                              <Badge variant="outline" className="text-[10px]">
                                {getTriggerLabel(alert)}
                              </Badge>

                              {!alert.enabled && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Paused
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-foreground font-medium">{getConditionLabel(alert)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{getContextLabel(alert)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Switch checked={alert.enabled} onCheckedChange={() => togglePriceAlert(alert.id)} />

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(alert)}
                            aria-label="Edit alert"
                            title="Edit alert"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deletePriceAlert(alert.id)}
                            aria-label="Delete alert"
                            title="Delete alert"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              History ({triggeredAlerts.length})
            </h4>

            <ScrollArea className="h-[170px]">
              {triggeredAlerts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-xs">No triggered alerts yet</p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {triggeredAlerts.slice(0, 25).map((alert) => (
                    <div key={alert.id} className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                          <span className="text-sm truncate">
                            {alert.assetDisplayName} — {getConditionLabel(alert)}
                          </span>
                        </div>

                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {alert.triggeredAt ? formatTime(alert.triggeredAt) : "Triggered"}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => restoreAlert(alert.id)}
                          aria-label="Restore alert"
                          title="Restore"
                        >
                          <Undo2 className="h-3 w-3" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deletePriceAlert(alert.id)}
                          aria-label="Delete alert"
                          title="Delete alert"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <CreatePriceAlertModal open={showCreateModal} onOpenChange={handleModalOpenChange} editingAlert={editingAlert} />
    </>
  );
}
