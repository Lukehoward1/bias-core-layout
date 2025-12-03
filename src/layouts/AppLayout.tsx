import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarProvider, useAppSidebar } from "@/hooks/use-app-sidebar";

function AppLayoutContent() {
  const { collapsed } = useAppSidebar();
  
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      {/* Spacer div to account for fixed sidebar */}
      <div className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 transition-all duration-300`} />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function AppLayout() {
  return (
    <AppSidebarProvider>
      <AppLayoutContent />
    </AppSidebarProvider>
  );
}
