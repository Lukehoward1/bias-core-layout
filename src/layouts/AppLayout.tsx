import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarProvider } from "@/hooks/use-app-sidebar";
import { SessionLockProvider, useSessionLock } from "@/hooks/use-session-lock";
import { LockScreen } from "@/components/LockScreen";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { InteractionDebugPanel } from "@/components/dev/InteractionDebugPanel";

function MobileHeader() {
  return null;
}

function AppLayoutContent() {
  const { isLocked } = useSessionLock();
  const isMobile = useIsMobile();

  return (
    <>
      {isLocked && <LockScreen />}

      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
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
      <SessionLockProvider>
        <AppLayoutContent />
      </SessionLockProvider>
    </AppSidebarProvider>
  );
}
