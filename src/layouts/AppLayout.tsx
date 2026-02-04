import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarProvider, useAppSidebar } from "@/hooks/use-app-sidebar";
import { useSessionLock } from "@/hooks/use-session-lock";
import { LockScreen } from "@/components/LockScreen";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { InteractionDebugPanel } from "@/components/dev/InteractionDebugPanel";

function MobileHeader() {
  const { setMobileOpen } = useAppSidebar();

  return (
    <div className="h-14 bg-sidebar border-b border-border flex items-center px-4 lg:hidden">
      <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="h-9 w-9">
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );
}

/**
 * Neutralise Lovable injected overlays / badge wrappers that can end up leaving
 * aria-hidden/inert behind and interfere with interaction inside the embedded preview.
 * This is intentionally conservative: it only runs when UNLOCKED.
 */
function patchLovableOverlays() {
  // Known Lovable elements seen in your blocker logs
  const selectors = [
    "#lovable-badge-divider",
    "aside#lovable-badge",
    "[aria-label='Edit with Lovable']",
    "[id*='lovable-badge']",
  ];

  const nodes = document.querySelectorAll<HTMLElement>(selectors.join(","));
  nodes.forEach((el) => {
    // Remove attributes that can participate in focus/interaction traps
    el.removeAttribute("aria-hidden");
    el.removeAttribute("inert");
    el.removeAttribute("data-aria-hidden");

    // Make sure these overlays can never steal clicks
    el.style.pointerEvents = "none";
    el.style.userSelect = "none";

    // Avoid them sitting “above” the app if styles go odd
    // (doesn't break their rendering, just prevents covering UI)
    if (el.style.position === "fixed" || el.style.position === "absolute") {
      el.style.zIndex = "0";
    }
  });
}

/**
 * General cleanup: remove stray aria-hidden/inert that can be left behind by overlays/modals.
 */
function clearInteractionTraps() {
  document.querySelectorAll<HTMLElement>('[aria-hidden="true"]').forEach((el) => el.removeAttribute("aria-hidden"));

  document.querySelectorAll<HTMLElement>("[data-aria-hidden]").forEach((el) => el.removeAttribute("data-aria-hidden"));

  document.querySelectorAll<HTMLElement>("[inert]").forEach((el) => el.removeAttribute("inert"));
}

function AppLayoutContent() {
  const { collapsed } = useAppSidebar();
  const { isLocked } = useSessionLock();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isLocked) return;

    // Run twice across frames to catch post-render mutations
    const run = () => {
      clearInteractionTraps();
      patchLovableOverlays();
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });

    // If Lovable re-applies aria-hidden later, keep removing it (UNLOCKED only)
    const obs = new MutationObserver(() => {
      run();
    });

    obs.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "data-aria-hidden", "inert", "style", "class"],
    });

    return () => obs.disconnect();
  }, [isLocked]);

  return (
    <>
      {/* Lock screen - rendered via portal, only when locked */}
      {isLocked && <LockScreen />}

      {/* Main app - always rendered */}
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        {/* Spacer div to account for fixed sidebar - desktop only */}
        {!isMobile && <div className={`${collapsed ? "w-16" : "w-60"} flex-shrink-0 transition-all duration-300`} />}

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Mobile header with hamburger */}
          {isMobile && <MobileHeader />}

          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* DEV-only interaction debug panel */}
      <InteractionDebugPanel />
    </>
  );
}

export function AppLayout() {
  return (
    <AppSidebarProvider>
      <AppLayoutContent />
    </AppSidebarProvider>
  );
}
