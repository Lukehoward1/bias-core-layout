import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSessionLock } from "@/hooks/use-session-lock";
import { useWatchlist } from "@/hooks/use-watchlist";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { getAllCalendarEvents, getEventDateTime } from "@/services/calendarData";
import type { CalendarEvent } from "@/data/calendarEvents";

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

type SessionConfig = {
  name: string;
  timeZone: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
};

const SESSION_CONFIGS: SessionConfig[] = [
  {
    name: "London Session Live",
    timeZone: "Europe/London",
    openHour: 8,
    openMinute: 0,
    closeHour: 16,
    closeMinute: 30,
  },
  {
    name: "New York Session Live",
    timeZone: "America/New_York",
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
  },
  { name: "Asia Session Live", timeZone: "Asia/Tokyo", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 0 },
];

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[get("weekday")] ?? 0,
    hour: Number(get("hour")) || 0,
    minute: Number(get("minute")) || 0,
    second: Number(get("second")) || 0,
  };
}

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function getActiveSession(now: Date) {
  for (const session of SESSION_CONFIGS) {
    const { weekday, hour, minute, second } = getTimeZoneParts(now, session.timeZone);

    const currentSeconds = hour * 3600 + minute * 60 + second;
    const openSeconds = session.openHour * 3600 + session.openMinute * 60;
    const closeSeconds = session.closeHour * 3600 + session.closeMinute * 60;

    const isWeekday = weekday >= 1 && weekday <= 5;
    const isOpen = isWeekday && currentSeconds >= openSeconds && currentSeconds < closeSeconds;

    if (isOpen) {
      return {
        name: session.name,
        timeRemaining: formatCountdown(closeSeconds - currentSeconds),
      };
    }
  }

  return {
    name: "Markets Monitoring",
    timeRemaining: "Next session pending",
  };
}

export function LockScreen() {
  const { isLocked, unlock, pinEnabled, pinSet } = useSessionLock();
  const { watchlistAssets } = useWatchlist();

  const [now, setNow] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showPairs, setShowPairs] = useState(false);

  const host = useMemo(() => {
    const el = document.createElement("div");
    el.setAttribute("data-lockscreen-host", "true");
    return el;
  }, []);

  useEffect(() => {
    document.body.appendChild(host);
    return () => {
      try {
        host.remove();
      } catch {
        // ignore
      }
    };
  }, [host]);

  useEffect(() => {
    if (!isLocked) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [isLocked]);

  const activeSession = useMemo(() => getActiveSession(now), [now]);

  const redNews = useMemo(() => {
    const currentTs = now.getTime();

    return getAllCalendarEvents()
      .map((event) => ({
        ...event,
        ts: getEventDateTime(event).getTime(),
      }))
      .filter((event) => !Number.isNaN(event.ts) && event.ts >= currentTs && event.impact === "high")
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 3);
  }, [now]);

  if (!isLocked) return null;

  const overlay = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/70 via-background to-background dark:from-gray-900 dark:via-gray-950 dark:to-black" />

      <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl text-center space-y-6">
          <div className="space-y-2">
            <div className="text-6xl sm:text-7xl font-light tracking-tight text-foreground">{formatTime(now)}</div>
            <div className="text-sm sm:text-base text-muted-foreground">{formatDate(now)}</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-sm shadow-sm">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-foreground">{activeSession.name}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{activeSession.timeRemaining}</span>
              </div>

              <button
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                onClick={() => setShowPairs(true)}
                type="button"
              >
                Edit pairs
              </button>
            </div>

            {watchlistAssets.length > 0 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {watchlistAssets.slice(0, 6).map((asset) => {
                  const bullish = asset.biasDirection === "Bullish";
                  const bearish = asset.biasDirection === "Bearish";

                  return (
                    <div
                      key={asset.symbol}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs shadow-sm"
                    >
                      <span className="font-medium text-foreground">{asset.symbol}</span>

                      <span
                        className={`font-medium ${
                          bullish ? "text-success" : bearish ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {bullish ? "↗" : bearish ? "↘" : "→"} {asset.biasDirection}
                      </span>

                      <span className="text-muted-foreground">{asset.biasConfidence}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-xs tracking-wider uppercase text-muted-foreground">Today’s red news</div>

            <div className="rounded-xl border border-border bg-card/90 shadow-sm overflow-hidden">
              {redNews.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">No upcoming high-impact events found.</div>
              ) : (
                redNews.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/60 transition text-left"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 text-sm text-muted-foreground">{event.time}</div>
                      <Badge variant="secondary" className="text-xs">
                        {event.currency}
                      </Badge>
                      <div className="text-sm text-foreground">{event.event}</div>
                    </div>
                    <div className="text-muted-foreground">›</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              onClick={() => unlock(undefined)}
              className="px-10"
              disabled={pinEnabled && pinSet}
              title={pinEnabled && pinSet ? "PIN is enabled — PIN entry can be added next." : "Unlock"}
            >
              Unlock
            </Button>

            {pinEnabled && pinSet && (
              <div className="text-xs text-muted-foreground">PIN is enabled. PIN entry UI can be added here next.</div>
            )}
          </div>
        </div>

        {showPairs && (
          <div
            className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center px-4"
            onClick={() => setShowPairs(false)}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-border bg-card p-5 text-left shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-foreground">Watchlist pairs</div>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPairs(false)}
                >
                  Close
                </button>
              </div>

              {watchlistAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No watchlist pairs selected yet.</p>
              ) : (
                <div className="space-y-2">
                  {watchlistAssets.slice(0, 6).map((asset) => {
                    const bullish = asset.biasDirection === "Bullish";

                    return (
                      <div
                        key={asset.symbol}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-medium text-sm text-foreground">{asset.symbol}</div>

                          <div
                            className={`flex items-center gap-1 text-xs font-medium ${
                              bullish
                                ? "text-success"
                                : asset.biasDirection === "Bearish"
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }`}
                          >
                            <span>{bullish ? "↗" : asset.biasDirection === "Bearish" ? "↘" : "→"}</span>

                            <span>{asset.biasDirection}</span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">{asset.biasConfidence}% confidence</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button onClick={() => setShowPairs(false)}>Close</Button>
              </div>
            </div>
          </div>
        )}

        <EventDetailsModal
          event={selectedEvent}
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          openedFromAlert={true}
        />
      </div>
    </div>
  );

  return createPortal(overlay, host);
}
