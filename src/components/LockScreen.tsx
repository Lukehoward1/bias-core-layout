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

  // If not locked, render nothing at all (cannot block the app)
  if (!isLocked) return null;

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
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Demo UI data (wire later)
  const sessionName = "London Session Live";
  const sessionTPlus = "2h 15m";

  const news: NewsItem[] = [
    { time: "08:30", currency: "USD", title: "Non-Farm Payrolls" },
    { time: "10:00", currency: "EUR", title: "CPI Flash Estimate" },
    { time: "14:00", currency: "GBP", title: "Interest Rate Decision" },
  ];

  const attemptUnlock = () => {
    // If PIN is enabled+set, this should be a PIN flow later.
    // For now, keep button unlock behaviour.
    const ok = unlock(undefined);
    if (!ok) {
      setModal({
        title: "Locked",
        body: "Unlock failed (PIN may be enabled). We can wire the PIN entry UI next.",
      });
    }
  };

  const overlay = (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-background via-background to-muted">
      {/* IMPORTANT: do NOT preventDefault on pointer events.
          That was killing click/press interactions. */}
      <div className="min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-3xl text-center space-y-6" onClick={(e) => e.stopPropagation()}>
          {/* Time + date */}
          <div className="space-y-2">
            <div className="text-6xl sm:text-7xl font-light tracking-tight text-foreground">{formatTime(now)}</div>
            <div className="text-sm sm:text-base text-muted-foreground">{formatDate(now)}</div>
          </div>

          {/* Session pill row */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-foreground">{sessionName}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{sessionTPlus}</span>
            </div>

            <button
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              onClick={() =>
                setModal({
                  title: "Edit pairs",
                  body: "Placeholder: next step is to wire this to your real pairs state (watchlist / selected pairs).",
                })
              }
              type="button"
            >
              Edit pairs
            </button>
          </div>

          {/* News list */}
          <div className="space-y-3">
            <div className="text-xs tracking-wider uppercase text-muted-foreground">Today’s red news</div>

            <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-background via-background to-muted">
              {news.map((n, idx) => (
                <button
                  key={`${n.time}-${n.currency}-${idx}`}
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/60 transition text-left"
                  onClick={() =>
                    setModal({
                      title: `${n.currency} • ${n.title}`,
                      body: `Time: ${n.time}\n\nNext step: open the Calendar event detail drawer / route (once we decide where these live).`,
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

          {/* Unlock */}
          <div className="pt-2 space-y-2">
            {/* We intentionally removed the “tap anywhere…” text because we’re button-only now */}
            <Button
              onClick={attemptUnlock}
              className="px-10"
              disabled={pinEnabled && pinSet}
              title={pinEnabled && pinSet ? "PIN is enabled — we’ll add PIN entry next." : "Unlock"}
            >
              Unlock
            </Button>

            {pinEnabled && pinSet && (
              <div className="text-xs text-muted-foreground">PIN is enabled. Next step: add PIN entry UI here.</div>
            )}
          </div>
        </div>

        {/* Simple modal */}
        {modal && (
          <div
            className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center px-4"
            onClick={() => setModal(null)}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-border bg-card p-5 text-left"
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
