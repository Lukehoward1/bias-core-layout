import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppSidebarProvider } from "@/hooks/use-app-sidebar";

export function AppLayout() {
  return (
    <AppSidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </AppSidebarProvider>
  );
}
