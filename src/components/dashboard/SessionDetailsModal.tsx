import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, X } from "lucide-react";
import { useAssets } from "@/hooks/use-watchlist";

export type TradingSessionName = "Asia" | "London" | "New York" | "Sydney";

export type TradingSession = {
  name: TradingSessionName;
  region: string;
  status: "active" | "closed";
  accent: string;

  opensAtLabel: string;
  closesAtLabel: string;
  timeRemainingLabel: string;
  timeRemainingSeconds: number;
};

type SessionDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  session: TradingSession | null;
};

const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

const formatHMS = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
};

export function SessionDetailsModal({ isOpen, onClose, session }: SessionDetailsModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAssetBySymbol } = useAssets();

  // keep a ticking counter derived from the incoming session seconds
  const initialSeconds = session?.timeRemainingSeconds ?? 0;
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);

  useEffect(() => {
    // reset when session changes / opens
    setSecondsLeft(initialSeconds);
  }, [initialSeconds, session?.name, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!session) return;

    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(id);
  }, [isOpen, session]);

  const safeSession = useMemo<TradingSession>(() => {
    return (
      session ?? {
        name: "Asia",
        region: "Asia-Pacific Markets",
        status: "active",
        accent: "#4361EE",
        opensAtLabel: "—",
        closesAtLabel: "Closes 01:23",
        timeRemainingLabel: "Session closes in",
        timeRemainingSeconds: 3600,
      }
    );
  }, [session]);

  // demo “most active assets” by session
  const activeAssets = useMemo(() => {
    switch (safeSession.name) {
      case "Asia":
        return ["USDJPY", "EURJPY", "GBPJPY"];
      case "London":
        return ["EURUSD", "GBPUSD", "EURGBP"];
      case "New York":
        return ["XAUUSD", "US30", "NAS100"];
      case "Sydney":
      default:
        return ["AUDUSD", "NZDUSD", "AUDJPY"];
    }
  }, [safeSession.name]);

  const goToAsset = useCallback(
    (symbol: string) => {
      onClose();

      requestAnimationFrame(() => {
        const state = location.state as { backgroundLocation?: Location } | null;
        const backgroundLocation = state?.backgroundLocation ?? location;

        navigate(`/asset/${symbol}`, {
          state: { backgroundLocation },
        });
      });
    },
    [navigate, location, onClose],
  );

  if (!session) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        />

        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-2xl max-h-[88vh] overflow-y-auto bg-background border border-border rounded-xl p-0 z-[10001]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: safeSession.accent }} />
              <div className="text-lg font-semibold text-foreground">{safeSession.name} Session</div>
              <Badge variant="secondary" className="text-xs">
                {safeSession.region}
              </Badge>
              <Badge className="text-xs">{safeSession.status === "active" ? "ACTIVE" : "CLOSED"}</Badge>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 space-y-4">
            {/* Time remaining */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <div className="font-semibold text-foreground">Time Remaining</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <div className="text-sm text-muted-foreground">{safeSession.timeRemainingLabel}</div>
                    <div className="text-3xl font-mono font-bold text-foreground mt-1">{formatHMS(secondsLeft)}</div>
                  </div>

                  <div className="text-sm text-muted-foreground justify-self-end text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>Opens</span>
                      <span className="text-foreground">{safeSession.opensAtLabel}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span>Closes</span>
                      <span className="text-foreground">{safeSession.closesAtLabel}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session stats (demo) */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="font-semibold text-foreground mb-3">Session Stats</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Typical volatility</div>
                    <div className="font-semibold text-foreground mt-1">Low</div>
                  </div>
                  <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Average range</div>
                    <div className="font-semibold text-foreground mt-1">Consolidation</div>
                  </div>
                  <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Best for</div>
                    <div className="font-semibold text-foreground mt-1">JPY crosses</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Most active assets */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="font-semibold text-foreground mb-3">Most Active Assets</div>
                <div className="flex flex-wrap gap-2">
                  {activeAssets.map((sym) => {
                    const exists = !!getAssetBySymbol(sym);

                    return exists ? (
                      <button
                        key={sym}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          goToAsset(sym);
                        }}
                        className="focus:outline-none"
                      >
                        <Badge className="cursor-pointer hover:opacity-90 transition-opacity">{sym}</Badge>
                      </button>
                    ) : (
                      <span key={sym} title="Coming soon">
                        <Badge variant="secondary" className="opacity-50 cursor-not-allowed">
                          {sym}
                        </Badge>
                      </span>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  (Demo list for now — later this will come from real activity data.)
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
