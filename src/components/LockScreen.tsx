import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSessionLock } from "@/hooks/use-session-lock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NewsItem = {
  time: string;
  currency: string;
  title: string;
};

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function LockScreen() {
  const { isLocked, unlock, pinEnabled, pinSet } = useSessionLock();
  const [now, setNow] = useState(() => new Date());
  const [modal, setModal] = useState<null | { title: string; body: string }>(null);

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

  if (!isLocked) return null;

  const sessionName = "London Session Live";
  const sessionTPlus = "2h 15m";

  const news: NewsItem[] = [
    { time: "08:30", currency: "USD", title: "Non-Farm Payrolls" },
    { time: "10:00", currency: "EUR", title: "CPI Flash Estimate" },
    { time: "14:00", currency: "GBP", title: "Interest Rate Decision" },
  ];

  const attemptUnlock = () => {
    const ok = unlock(undefined);
    if (!ok) {
      setModal({
        title: "Locked",
        body: "Unlock failed. PIN entry can be wired here next.",
      });
    }
  };

  const overlay = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/70 via-background to-background dark:from-gray-900 dark:via-gray-950 dark:to-black" />

      <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl text-center space-y-6">
          <div className="space-y-2">
            <div className="text-6xl sm:text-7xl font-light tracking-tight text-foreground">{formatTime(now)}</div>
            <div className="text-sm sm:text-base text-muted-foreground">{formatDate(now)}</div>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-sm shadow-sm">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-foreground">{sessionName}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{sessionTPlus}</span>
            </div>

            <button
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              onClick={() =>
                setModal({
                  title: "Edit pairs",
                  body: "Placeholder: this can later connect to selected pairs or watchlist preferences.",
                })
              }
              type="button"
            >
              Edit pairs
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-xs tracking-wider uppercase text-muted-foreground">Today’s red news</div>

            <div className="rounded-xl border border-border bg-card/90 shadow-sm overflow-hidden">
              {news.map((n, idx) => (
                <button
                  key={`${n.time}-${n.currency}-${idx}`}
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/60 transition text-left"
                  onClick={() =>
                    setModal({
                      title: `${n.currency} • ${n.title}`,
                      body: `Time: ${n.time}\n\nLater this can open the full calendar event detail modal.`,
                    })
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 text-sm text-muted-foreground">{n.time}</div>
                    <Badge variant="secondary" className="text-xs">
                      {n.currency}
                    </Badge>
                    <div className="text-sm text-foreground">{n.title}</div>
                  </div>
                  <div className="text-muted-foreground">›</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              onClick={attemptUnlock}
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

        {modal && (
          <div
            className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center px-4"
            onClick={() => setModal(null)}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-border bg-card p-5 text-left shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-foreground">{modal.title}</div>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setModal(null)}
                >
                  Close
                </button>
              </div>

              <div className="text-sm text-muted-foreground whitespace-pre-line">{modal.body}</div>

              <div className="mt-4 flex justify-end">
                <Button onClick={() => setModal(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, host);
}
