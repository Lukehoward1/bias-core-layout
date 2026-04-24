// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { SessionLockProvider } from "@/hooks/use-session-lock";
import { AlertsProvider } from "@/contexts/AlertsContext";
import { GlobalNotifications } from "@/components/alerts/GlobalNotifications";
import { AppLayout } from "@/layouts/AppLayout";

import { ActiveTradingAccountProvider } from "@/context/ActiveTradingAccountProvider";
import { TraderStyleProvider } from "@/context/TraderStyleProvider";

import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Alerts from "./pages/Alerts";
import RiskTools from "./pages/RiskTools";
import Journal from "./pages/Journal";
import Education from "./pages/Education";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import AssetDetail from "./pages/AssetDetail";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/risk-tools" element={<RiskTools />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/education" element={<Education />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/asset/:symbol" element={<AssetDetail />} />
      </Route>

      <Route path="/pricing" element={<Pricing />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <AlertsProvider>
            <SessionLockProvider>
              <TraderStyleProvider>
                <ActiveTradingAccountProvider>
                  <GlobalNotifications />
                  <Toaster />
                  <Sonner />
                  <AppRoutes />
                </ActiveTradingAccountProvider>
              </TraderStyleProvider>
            </SessionLockProvider>
          </AlertsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
