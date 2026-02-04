import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSessionLock } from "@/hooks/use-session-lock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LockScreen() {
  const { isLocked, unlock, pinEnabled, pinSet } = useSessionLock();

  // IMPORTANT: if not locked, render nothing at all.
  // This guarantees the overlay can't sit on top of the app.
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
      // remove host and its children (overlay) completely
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
      // capture clicks so they don't leak to the app beneath
      onPointerDown={(e) => e.preventDefault()}
      onClick={onBackgroundClick}
    >
      <div
        className="text-center space-y-6 px-6 max-w-2xl w-full"
        // stop inner panel clicks from triggering background unlock
        onClick={(e) => e.stopPropagation()}
      >
        {/* Keep your existing UI look here if you want.
            This is a safe minimal lockscreen shell that won't break clicks. */}
        <div className="text-6xl font-light tracking-tight text-foreground">
          {/* You can replace this with your current time UI */}
          Locked
        </div>

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
