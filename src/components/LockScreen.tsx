import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSessionLock } from "@/hooks/use-session-lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LockScreen() {
  const { isLocked, unlock, pinEnabled, pinSet } = useSessionLock();

  // If not locked, render nothing at all.
  if (!isLocked) return null;

  const [pin, setPinState] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Create a dedicated portal host and ALWAYS remove it on unmount.
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

    // If PIN is enabled+set, enforce it; otherwise allow tap to unlock
    const ok = unlock(pinEnabled && pinSet ? pin : undefined);

    if (!ok) {
      setError("Incorrect PIN");
      setPinState("");
    }
  };

  const onBackgroundClick = () => {
    // If PIN protection is enabled+set, you must enter it
    if (pinEnabled && pinSet) return;
    attemptUnlock();
  };

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center"
      // IMPORTANT: do NOT preventDefault here (it can kill click routing elsewhere)
      // We only stop propagation so clicks don't "leak" into the app when locked.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onBackgroundClick}
    >
      <div
        className="text-center space-y-6 px-6 max-w-2xl w-full"
        // stop inner panel clicks from triggering background unlock
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl font-light tracking-tight text-foreground">Locked</div>

        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <div className="rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground">
            Tap to unlock your dashboard
          </div>
        </div>

        {pinEnabled && pinSet && (
          <div className="mx-auto max-w-xs space-y-3">
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
        )}
      </div>
    </div>
  );

  return createPortal(overlay, host);
}
