import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarProvider, useAppSidebar } from "@/hooks/use-app-sidebar";
import { useSessionLock } from "@/hooks/use-session-lock";
import { LockScreen } from "@/components/LockScreen";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

// Dev flag to disable lock overlay during development if it causes issues
const ENABLE_LOCK_OVERLAY = localStorage.getItem('dev-disable-lock-overlay') !== 'true';

function MobileHeader() {
  const { setMobileOpen } = useAppSidebar();
  
  return (
    <div className="h-14 bg-sidebar border-b border-border flex items-center px-4 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="h-9 w-9"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );
}

// Safety cleanup function to remove any stray interaction blockers
function cleanupInteractionBlockers() {
  const appRoot = document.getElementById('root');
  if (appRoot) {
    appRoot.removeAttribute('inert');
    appRoot.removeAttribute('aria-hidden');
    appRoot.style.pointerEvents = '';
  }
  // Clean any elements marked by Radix dialogs
  document.querySelectorAll('[data-aria-hidden="true"]').forEach(el => {
    el.removeAttribute('aria-hidden');
    el.removeAttribute('data-aria-hidden');
  });
  document.querySelectorAll('[inert]').forEach(el => {
    el.removeAttribute('inert');
  });
}

function AppLayoutContent() {
  const { collapsed } = useAppSidebar();
  const { isLocked, unlock } = useSessionLock();
  const isMobile = useIsMobile();
  
  // Check if lock overlay is enabled (can be disabled via dev toggle)
  const showLockScreen = ENABLE_LOCK_OVERLAY && isLocked;
  
  // Run cleanup whenever we transition from locked to unlocked
  useEffect(() => {
    if (!showLockScreen) {
      // Small delay to ensure any Radix cleanup has a chance to run first
      const timer = setTimeout(() => {
        cleanupInteractionBlockers();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showLockScreen]);
  
  // Also run cleanup on mount in case we're in a broken state
  useEffect(() => {
    if (!showLockScreen) {
      cleanupInteractionBlockers();
    }
  }, []);
  
  return (
    <>
      {/* Lock screen overlay - only renders when enabled AND locked, fully unmounts otherwise */}
      {showLockScreen && <LockScreen onUnlock={unlock} />}
      
      {/* Main app - ALWAYS interactive when lock screen is not shown */}
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        {/* Spacer div to account for fixed sidebar - desktop only */}
        {!isMobile && (
          <div className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 transition-all duration-300`} />
        )}
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Mobile header with hamburger */}
          {isMobile && <MobileHeader />}
          
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
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
