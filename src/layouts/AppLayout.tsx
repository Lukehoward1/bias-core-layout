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

function AppLayoutContent() {
  const { collapsed } = useAppSidebar();
  const { isLocked } = useSessionLock();
  const isMobile = useIsMobile();

  // Safety cleanup: ensure nothing is left aria-hidden/inert after unlock
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
    <AppSidebarProvider>
      <AppLayoutContent />
    </AppSidebarProvider>
  );
}
