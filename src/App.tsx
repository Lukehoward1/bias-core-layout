// src/App.tsx
import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { SessionLockProvider } from "@/hooks/use-session-lock";
import { AlertsProvider } from "@/contexts/AlertsContext";
import { GlobalNotifications } from "@/components/alerts/GlobalNotifications";
import { AppLayout } from "@/layouts/AppLayout";

import { ActiveTradingAccountProvider } from "@/context/ActiveTradingAccountProvider";
import { TraderStyleProvider } from "@/context/TraderStyleProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import AuthCallback from "./pages/AuthCallback";
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

function SubscriptionActivatingGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive, isLoading, refetch } = useSubscription();
  const isPostPayment = new URLSearchParams(location.search).get("subscription") === "success";
  const [polling, setPolling] = useState(false);
  const attemptRef = useRef(0);

  // Once subscription loading resolves, decide whether to poll or toast
  useEffect(() => {
    if (!isPostPayment || isLoading) return;
    if (isActive) {
      toast.success("Welcome to StreamBias! Your 7-day trial has started.");
      navigate(location.pathname, { replace: true });
    } else {
      attemptRef.current = 0;
      setPolling(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isPostPayment]);

  // Retry loop — fires every 1.5s while waiting for webhook to write the profile
  useEffect(() => {
    if (!polling) return;
    if (isActive) {
      setPolling(false);
      toast.success("Welcome to StreamBias! Your 7-day trial has started.");
      navigate(location.pathname, { replace: true });
      return;
    }
    if (attemptRef.current >= 10) { setPolling(false); return; }
    const t = setTimeout(() => { attemptRef.current += 1; refetch(); }, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, isActive]);

  if (!polling) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Setting up your account…</p>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();

  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pricing" element={<Pricing />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
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
            <SubscriptionProvider>
              <AlertsProvider>
                <SessionLockProvider>
                  <TraderStyleProvider>
                    <ActiveTradingAccountProvider>
                      <GlobalNotifications />
                      <Toaster />
                      <Sonner />
                      <SubscriptionActivatingGuard />
                      <AppRoutes />
                    </ActiveTradingAccountProvider>
                  </TraderStyleProvider>
                </SessionLockProvider>
              </AlertsProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
