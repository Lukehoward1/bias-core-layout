import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSessionLock } from "@/hooks/use-session-lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function LockScreen() {
  const { isLocked, unlock, pinEnabled, pinSet } = useSessionLock();

  if (!isLocked) return null;

  const [now, setNow] = useState(() => new Date());
  const [pin, setPinState] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

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

  const attemptUnlock = () => {
    setError(null);
    const ok = unlock(pinEnabled && pinSet ? pin : undefined);

    if (!ok) {
      setError("Incorrect PIN");
      setPinState("");
    }
  };

  const onBackgroundClick = () => {
    if (pinEnabled && pinSet) return; // require PIN if enabled
    attemptUnlock();
  };

  // Placeholders for now (we can wire these later)
  const sessionLabel = "London Session Live";
  const sessionTimer = "2h 15m"; // placeholder timer next to session

  const redNews = [
    { time: "08:30", ccy: "USD", title: "Non-Farm Payrolls" },
    { time: "10:00", ccy: "EUR", title: "CPI Flash Estimate" },
    { time: "14:00", ccy: "GBP", title: "Interest Rate Decision" },
  ];

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 via-gray-950 to-black"
      // IMPORTANT: do NOT preventDefault here.
      // We want normal click behavior within the lock screen.
      onClick={onBackgroundClick}
    >
      {/* Full-screen positioning wrapper (NO stopPropagation here) */}
      <div className="min-h-screen w-full flex items-center justify-center px-6 py-10">
        {/* Center “card” area (THIS is what should not unlock when clicked) */}
        <div className="w-full max-w-3xl text-center" onClick={(e) => e.stopPropagation()}>
          {/* Clock */}
          <div className="text-[72px] sm:text-[92px] leading-none font-light tracking-tight text-foreground">
            {formatTime(now)}
          </div>
          <div className="mt-3 text-sm sm:text-base text-muted-foreground">{formatDate(now)}</div>

          {/* Session pill + timer */}
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-2 text-sm text-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>{sessionLabel}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{sessionTimer}</span>
            </div>

            <button
              type="button"
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              onClick={() => console.log("Edit pairs clicked")}
            >
              Edit pairs
            </button>
          </div>

          {/* Red news */}
          <div className="mt-10">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Today&apos;s Red News
            </div>

            <div className="mt-4 space-y-3 text-left">
              {redNews.map((e) => (
                <button
                  key={`${e.time}-${e.ccy}-${e.title}`}
                  type="button"
                  className="w-full text-left flex items-center justify-between rounded-xl border border-border bg-card/30 px-4 py-3 hover:bg-card/40 transition"
                  onClick={() => console.log("News clicked:", e)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground w-[56px]">{e.time}</div>
                    <div className="text-xs font-semibold rounded-full bg-black/30 border border-border px-2 py-1">
                      {e.ccy}
                    </div>
                    <div className="text-sm text-foreground">{e.title}</div>
                  </div>

                  <div className="text-muted-foreground">›</div>
                </button>
              ))}
            </div>

            {/* Only show this hint when tap-to-unlock is valid */}
            {!pinEnabled || !pinSet ? (
              <div className="mt-6 text-xs text-muted-foreground">
                Tap anywhere outside this panel to unlock your dashboard
              </div>
            ) : (
              <div className="mt-6 text-xs text-muted-foreground">Enter your PIN to unlock</div>
            )}
          </div>

          {/* PIN unlock (only when enabled) */}
          {pinEnabled && pinSet ? (
            <div className="mt-8 mx-auto max-w-xs space-y-3">
              <Input
                value={pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPinState(v);
                }}
                inputMode="numeric"
                placeholder="Enter 4-digit PIN"
                className="text-center text-lg tracking-widest"
              />

              {error && <div className="text-sm text-destructive">{error}</div>}

              <Button className="w-full" onClick={attemptUnlock} disabled={pin.length !== 4}>
                Unlock
              </Button>
            </div>
          ) : (
            // Optional explicit button (so you’re not forced to tap background)
            <div className="mt-8 flex justify-center">
              <Button onClick={attemptUnlock}>Unlock</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, host);
}
