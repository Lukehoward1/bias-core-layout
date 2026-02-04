import { Outlet } from "react-router-dom";
import { useEffect } from "react";
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

function AppLayoutContent() {
  const { collapsed } = useAppSidebar();
  const { isLocked } = useSessionLock();
  const isMobile = useIsMobile();

  // LOVABLE PREVIEW FIX:
  // Lovable injects a divider/badge element that intermittently breaks hit-testing in the preview iframe.
  // We neutralise it ONLY in Lovable preview so you can keep working visually.
  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const isLovablePreview = host.includes("lovable.app") || host.includes("lovableproject.com");

    if (!isLovablePreview) return;

    const kill = () => {
      const el = document.getElementById("lovable-badge-divider");
      if (el) {
        // Make it harmless (and remove if possible)
        (el as HTMLElement).style.pointerEvents = "none";
        el.removeAttribute("aria-hidden");
        try {
          el.remove();
        } catch {
          // ignore
        }
      }
    };

    // Run now + keep re-running because Lovable reinjects it
    kill();
    const interval = window.setInterval(kill, 250);

    // Also watch DOM changes (more reliable than interval alone)
    const mo = new MutationObserver(() => kill());
    mo.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      window.clearInterval(interval);
      mo.disconnect();
    };
  }, []);

  // SAFETY CLEANUP: ensure nothing is left aria-hidden/inert after unlock (your existing safety net)
  useEffect(() => {
    if (!isLocked) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.removeAttribute("aria-hidden"));

          document.querySelectorAll("[inert]").forEach((el) => el.removeAttribute("inert"));
        });
      });
    }
  }, [isLocked]);

  return (
    <>
      {/* Lock screen - only when locked */}
      {isLocked && <LockScreen />}

      {/* Main app */}
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        {/* Spacer div to account for fixed sidebar - desktop only */}
        {!isMobile && <div className={`${collapsed ? "w-16" : "w-60"} flex-shrink-0 transition-all duration-300`} />}

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
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
