import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarProvider } from "@/hooks/use-app-sidebar";
import { useSessionLock } from "@/hooks/use-session-lock";
import { LockScreen } from "@/components/LockScreen";
import { useEffect } from "react";

function AppLayoutInner() {
  const { isLocked } = useSessionLock();
  const location = useLocation();

  // HARD reset on every route change
  useEffect(() => {
    document.documentElement.style.pointerEvents = "auto";
    document.body.style.pointerEvents = "auto";
    document.querySelectorAll("[inert]").forEach((el) => el.removeAttribute("inert"));
    document.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.removeAttribute("aria-hidden"));

    // Force scroll to top of main content
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [location.pathname, isLocked]);

  return (
    <div className="flex w-full h-screen overflow-hidden">
      {/* Sidebar stays in normal flow */}
      <AppSidebar />

      {/* Content column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Lock screen ALWAYS on top */}
      {isLocked && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          <LockScreen />
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  return (
    <AppSidebarProvider>
      <AppLayoutInner />
    </AppSidebarProvider>
  );
}
