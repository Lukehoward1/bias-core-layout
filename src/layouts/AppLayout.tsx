import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarProvider } from "@/hooks/use-app-sidebar";
import { useSessionLock } from "@/hooks/use-session-lock";
import { LockScreen } from "@/components/LockScreen";
import { useEffect } from "react";

function AppLayoutInner() {
  const { isLocked } = useSessionLock();
  const location = useLocation();

  useEffect(() => {
    // Only ever reset within the app shell, not the whole document
    const shell = document.getElementById("app-shell");
    if (!shell) return;

    // Ensure the app is interactable
    (shell as HTMLElement).style.pointerEvents = "auto";
    document.body.style.pointerEvents = "auto";

    // Remove inert/aria-hidden ONLY inside the app shell
    shell.querySelectorAll("[inert]").forEach((el) => el.removeAttribute("inert"));
    shell.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.removeAttribute("aria-hidden"));

    // Scroll main content to top
    const main = shell.querySelector("main");
    if (main) (main as HTMLElement).scrollTop = 0;
  }, [location.pathname, isLocked]);

  return (
    <div id="app-shell" className="flex w-full h-screen overflow-hidden bg-background">
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
