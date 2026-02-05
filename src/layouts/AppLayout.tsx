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

  // Desktop sidebar widths
  const desktopSidebarPad = collapsed ? "lg:pl-16" : "lg:pl-60";

  return (
    <>
      {isLocked && <LockScreen />}

      {/* Sidebar is fixed on desktop. Main content is padded-left to match it. */}
      <div className="min-h-screen w-full">
        <AppSidebar />

        <div className={`min-h-screen w-full ${desktopSidebarPad}`}>
          {isMobile && <MobileHeader />}

          <main className="min-h-[calc(100vh)] overflow-y-auto">
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
