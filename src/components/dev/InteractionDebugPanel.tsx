import { useState, useEffect } from "react";
import { useSessionLock } from "@/hooks/use-session-lock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DebugState {
  htmlPointerEvents: string;
  bodyPointerEvents: string;
  rootPointerEvents: string;
  inertCount: number;
  ariaHiddenCount: number;
  centerElement: string;
}

export function InteractionDebugPanel() {
  const [enabled, setEnabled] = useState(false);
  const { isLocked } = useSessionLock();
  const [state, setState] = useState<DebugState>({
    htmlPointerEvents: "",
    bodyPointerEvents: "",
    rootPointerEvents: "",
    inertCount: 0,
    ariaHiddenCount: 0,
    centerElement: "",
  });

  // Check if dev mode is enabled
  useEffect(() => {
    const check = () => {
      setEnabled(localStorage.getItem("dev-interaction-debug") === "true");
    };
    check();
    // Re-check on storage changes
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  // Update state every 500ms
  useEffect(() => {
    if (!enabled) return;

    const update = () => {
      const root = document.getElementById("root");
      const inertElements = document.querySelectorAll("[inert]");
      const ariaHiddenElements = document.querySelectorAll('[aria-hidden="true"]');
      
      // Get center element
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const centerEl = document.elementFromPoint(centerX, centerY);
      const centerInfo = centerEl 
        ? `${centerEl.tagName.toLowerCase()}${centerEl.className ? `.${String(centerEl.className).split(" ").filter(Boolean).join(".")}` : ""}`
        : "none";

      setState({
        htmlPointerEvents: document.documentElement.style.pointerEvents || "(not set)",
        bodyPointerEvents: document.body.style.pointerEvents || "(not set)",
        rootPointerEvents: root?.style.pointerEvents || "(not set)",
        inertCount: inertElements.length,
        ariaHiddenCount: ariaHiddenElements.length,
        centerElement: centerInfo,
      });
    };

    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [enabled]);

  const handleLogBlockers = () => {
    const inertElements = Array.from(document.querySelectorAll("[inert]"));
    const ariaHiddenElements = Array.from(document.querySelectorAll('[aria-hidden="true"]'));
    const pointerEventsNone = Array.from(document.querySelectorAll('[style*="pointer-events"]')).filter(
      (el) => (el as HTMLElement).style.pointerEvents === "none"
    );

    console.group("🔍 Interaction Blockers");
    console.log("Elements with [inert]:", inertElements);
    console.log("Elements with aria-hidden='true':", ariaHiddenElements);
    console.log("Elements with pointer-events: none:", pointerEventsNone);
    console.groupEnd();
  };

  if (!enabled) return null;

  return (
    <Card
      className="fixed bottom-4 right-4 w-80 text-xs shadow-lg border-2 border-yellow-500 bg-background/95 backdrop-blur"
      style={{ zIndex: 9999, pointerEvents: "auto" }}
    >
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm font-mono text-yellow-600">🛠 Interaction Debug</CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3 space-y-2">
        <div className="grid grid-cols-2 gap-1 font-mono">
          <span className="text-muted-foreground">isLocked:</span>
          <span className={isLocked ? "text-red-500" : "text-green-500"}>
            {isLocked ? "true" : "false"}
          </span>

          <span className="text-muted-foreground">html.pointerEvents:</span>
          <span className={state.htmlPointerEvents === "none" ? "text-red-500" : ""}>
            {state.htmlPointerEvents}
          </span>

          <span className="text-muted-foreground">body.pointerEvents:</span>
          <span className={state.bodyPointerEvents === "none" ? "text-red-500" : ""}>
            {state.bodyPointerEvents}
          </span>

          <span className="text-muted-foreground">#root.pointerEvents:</span>
          <span className={state.rootPointerEvents === "none" ? "text-red-500" : ""}>
            {state.rootPointerEvents}
          </span>

          <span className="text-muted-foreground">[inert] count:</span>
          <span className={state.inertCount > 0 ? "text-red-500" : ""}>
            {state.inertCount}
          </span>

          <span className="text-muted-foreground">aria-hidden count:</span>
          <span className={state.ariaHiddenCount > 0 ? "text-yellow-500" : ""}>
            {state.ariaHiddenCount}
          </span>
        </div>

        <div className="border-t pt-2">
          <span className="text-muted-foreground font-mono">Center element:</span>
          <div className="text-[10px] font-mono break-all mt-1 bg-muted p-1 rounded">
            {state.centerElement}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={handleLogBlockers} className="flex-1 text-xs h-7">
            Log Blockers
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
