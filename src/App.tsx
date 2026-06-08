// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, useParams } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { SessionLockProvider } from "@/hooks/use-session-lock";
import { AlertsProvider } from "@/contexts/AlertsContext";
import { GlobalNotifications } from "@/components/alerts/GlobalNotifications";
import { AppLayout } from "@/layouts/AppLayout";

import { ActiveTradingAccountProvider } from "@/context/ActiveTradingAccountProvider";
import { TraderStyleProvider } from "@/context/TraderStyleProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

function AssetDetailWithBoundary() {
  const { symbol } = useParams<{ symbol: string }>();
  return (
    <ErrorBoundary key={symbol} fallbackMessage="Failed to load asset">
      <AssetDetail />
    </ErrorBoundary>
  );
}

function AppRoutes() {
  const location = useLocation();

  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pricing" element={<Pricing />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/risk-tools" element={<RiskTools />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/education" element={<Education />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/billing" element={<Billing />} />

            {!backgroundLocation && <Route path="/markets/:symbol" element={<AssetDetailWithBoundary />} />}
            {!backgroundLocation && <Route path="/asset/:symbol" element={<AssetDetailWithBoundary />} />}
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/markets/:symbol" element={<AssetDetailWithBoundary />} />
          <Route path="/asset/:symbol" element={<AssetDetailWithBoundary />} />
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
          <AuthProvider>
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
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
