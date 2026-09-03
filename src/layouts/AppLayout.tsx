import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarProvider } from "@/hooks/use-app-sidebar";
import { useSessionLock } from "@/hooks/use-session-lock";
import { LockScreen } from "@/components/LockScreen";
import { TrialBanner } from "@/components/TrialBanner";
import { DowngradeBanner } from "@/components/DowngradeBanner";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useBrokerSync } from "@/hooks/use-broker-sync";
import { useEffect } from "react";

function AppLayoutInner() {
  const { isLocked } = useSessionLock();
  const location = useLocation();
  useBrokerSync();

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
        <TrialBanner />
        <DowngradeBanner />
        <main className="flex-1 overflow-y-auto min-w-0 touch-manipulation">
          <Outlet />
        </main>
      </div>

      {/* Lock screen ALWAYS on top */}
      {isLocked && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          <LockScreen />
        </div>
      )}

      {/* Onboarding — must be completed before using the app, but ONLY once
          the user has unlocked. Rendering both simultaneously would silently
          soft-lock a fresh signup: Radix Dialog calls `hideOthers` from the
          aria-hidden package on every body-level sibling of its portal
          (react-dialog/dist/index.mjs imports it directly), which applies
          `inert` to LockScreen's own body-level portal host. LockScreen then
          renders visually on top at z-9999 but can't receive a single click,
          because Radix has turned its DOM subtree inert. Order matters here —
          unlock first, then onboarding. */}
      {!isLocked && <OnboardingModal />}
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
