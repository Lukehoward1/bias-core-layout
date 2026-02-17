import { useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Clock, Activity, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type TradingSession = {
  name: "Sydney" | "Asia" | "London" | "New York";
  region: string;
  status: "active" | "closed";
  accent: string; // hex for left bar / dot
  opensAtLabel: string; // e.g. "22:00 GMT"
  closesAtLabel: string; // e.g. "07:00 GMT"
  timeRemainingLabel: string; // e.g. "Closes in 1h 23m 45s"
  timeRemainingSeconds: number; // live countdown value from Dashboard
};

interface SessionDetailsModalProps {
  session: TradingSession | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatHMS = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

// Demo placeholders (you'll wire real stats later)
const sessionVolumeStats: Record<string, { label: string; value: string }[]> = {
  Sydney: [
    { label: "Typical volatility", value: "Low–Medium" },
    { label: "Average range", value: "Smaller" },
    { label: "Best for", value: "AUD / NZD" },
  ],
  Asia: [
    { label: "Typical volatility", value: "Low" },
    { label: "Average range", value: "Consolidation" },
    { label: "Best for", value: "JPY crosses" },
  ],
  London: [
    { label: "Typical volatility", value: "High" },
    { label: "Average range", value: "Large" },
    { label: "Best for", value: "EUR / GBP" },
  ],
  "New York": [
    { label: "Typical volatility", value: "High" },
    { label: "Average range", value: "Large" },
    { label: "Best for", value: "USD + indices" },
  ],
};

const sessionActiveAssets: Record<string, string[]> = {
  Sydney: ["AUDUSD", "NZDUSD", "AUDJPY"],
  Asia: ["USDJPY", "EURJPY", "GBPJPY"],
  London: ["EURUSD", "GBPUSD", "EURGBP", "XAUUSD"],
  "New York": ["SPX500", "NAS100", "XAUUSD", "EURUSD", "USDJPY"],
};

export function SessionDetailsModal({ session, isOpen, onClose }: SessionDetailsModalProps) {
  // keep hooks stable
  const safeSession: TradingSession = useMemo(
    () =>
      session ?? {
        name: "London",
        region: "—",
        status: "closed",
        accent: "#4361EE",
        opensAtLabel: "—",
        closesAtLabel: "—",
        timeRemainingLabel: "—",
        timeRemainingSeconds: 0,
      },
    [session],
  );

  const isActive = safeSession.status === "active";
  const hms = useMemo(() => formatHMS(safeSession.timeRemainingSeconds), [safeSession.timeRemainingSeconds]);

  // If no session, render nothing (hooks already ran safely)
  if (!session) return null;

  const stats = sessionVolumeStats[safeSession.name] ?? [];
  const assets = sessionActiveAssets[safeSession.name] ?? [];

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[9000] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        />

        {/* Content */}
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[9001] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-border bg-background shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Sticky header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: safeSession.accent }}
              />
              <span className="text-lg font-semibold text-foreground">
                {safeSession.name} Session
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {safeSession.region}
              </Badge>
              <Badge
                variant={isActive ? "default" : "outline"}
                className="text-[10px]"
              >
                {isActive ? "ACTIVE" : "CLOSED"}
              </Badge>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
            {/* Countdown */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Time Remaining
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isActive ? "Session closes in" : "Session opens in"}
                    </p>
                    <p className="text-3xl font-mono font-bold text-foreground tracking-wider">
                      {hms}
                    </p>
                  </div>

                  <div className="text-right text-xs text-muted-foreground space-y-1">
                    <p>Opens</p>
                    <p className="text-foreground font-medium">{safeSession.opensAtLabel}</p>
                    <p>Closes</p>
                    <p className="text-foreground font-medium">{safeSession.closesAtLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Session Stats
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {stats.map((s) => (
                    <div key={s.label} className="text-center p-2 rounded-lg bg-muted/40">
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      <p className="text-sm font-semibold text-foreground">{s.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Most active assets */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Most Active Assets
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {assets.map((a) => (
                    <Badge key={a} variant="secondary" className="text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground mt-3">
                  (Demo list for now — later this will come from real activity data.)
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
