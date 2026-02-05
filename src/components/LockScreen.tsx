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

  // Create a dedicated portal host and remove it on unmount.
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

  // ✅ Outside click should unlock when no PIN is set.
  const onBackgroundClick = () => {
    if (pinEnabled && pinSet) return; // must use PIN / button
    attemptUnlock();
  };

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center"
      onClick={onBackgroundClick}
    >
      <div className="text-center space-y-6 px-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Replace these bits with your existing time/date UI if you want */}
        <div className="text-6xl font-light tracking-tight text-foreground">Locked</div>

        {/* ❌ Removed the “tap anywhere…” text (since it was misleading) */}

        {/* PIN block (only if enabled+set) */}
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
          </div>
        )}

        {/* ✅ Always show an Unlock button */}
        <div className="flex justify-center">
          <Button
            className="min-w-[140px]"
            onClick={attemptUnlock}
            disabled={pinEnabled && pinSet ? pin.length !== 4 : false}
          >
            Unlock
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, host);
}
