// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { SessionLockProvider } from "@/hooks/use-session-lock";
import { AlertsProvider } from "@/contexts/AlertsContext";
import { GlobalNotifications } from "@/components/alerts/GlobalNotifications";
import { AppLayout } from "@/layouts/AppLayout";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Global selection providers
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

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/risk-tools" element={<RiskTools />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/education" element={<Education />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/billing" element={<Billing />} />
        </Route>

        <Route path="/pricing" element={<Pricing />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route
            path="/asset/:symbol"
            element={
              <Dialog
                open
                onOpenChange={(open) => {
                  if (!open) navigate(-1);
                }}
              >
                <DialogContent
                  className="
                    max-w-6xl w-[96vw]
                    max-h-[92vh]
                    overflow-y-auto
                    p-0
                    bg-background
                    border-border
                    backdrop-blur
                  "
                >
                  <AssetDetail />
                </DialogContent>
              </Dialog>
            }
          />
        </Routes>
      )}
    </>
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
                  {/* ✅ must be inside AlertsProvider */}
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
