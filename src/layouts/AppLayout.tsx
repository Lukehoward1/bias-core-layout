import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarProvider, useAppSidebar } from "@/hooks/use-app-sidebar";
import { SessionLockProvider, useSessionLock } from "@/hooks/use-session-lock";
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
  const location = useLocation();

  /**
   * SAFETY CLEANUP (runs after unlock + on route changes):
   * Removes any stray aria-hidden/inert that can “freeze” the app.
   * Also removes any stale lockscreen portal hosts if they were left behind.
   */
  useEffect(() => {
    if (isLocked) return;

    const cleanup = () => {
      // 1) Remove aria-hidden flags that can block focus/click routing in some setups
      document.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.removeAttribute("aria-hidden"));

      // 2) Remove inert attributes that can block pointer/keyboard interaction
      document.querySelectorAll("[inert]").forEach((el) => el.removeAttribute("inert"));

      // 3) Remove any stale lockscreen portal hosts (should not exist when unlocked)
      document.querySelectorAll('[data-lockscreen-host="true"]').forEach((el) => el.parentElement?.removeChild(el));
    };

    // Run twice across frames to catch cases where another component sets flags during the same paint.
    requestAnimationFrame(() => {
      cleanup();
      requestAnimationFrame(cleanup);
    });
  }, [isLocked, location.pathname]);

  return (
    <>
      {isLocked && <LockScreen />}

      <div className="flex min-h-screen w-full">
        <AppSidebar />

        {!isMobile && <div className={`${collapsed ? "w-16" : "w-60"} flex-shrink-0 transition-all duration-300`} />}

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {isMobile && <MobileHeader />}

          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>

      <InteractionDebugPanel />
    </>
  );
}

export function AppLayout() {
  return (
    <SessionLockProvider>
      <AppSidebarProvider>
        <AppLayoutContent />
      </AppSidebarProvider>
    </SessionLockProvider>
  );
}
