// src/App.tsx
import React, { useEffect } from "react";
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
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { SubscriptionActivatingGuard } from "@/components/SubscriptionActivatingGuard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { getConsentStatus, ConsentStatus } from "@/lib/cookieConsent";
import { loadGoogleAnalytics, trackPageView } from "@/lib/analytics";

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
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import StartTrial from "./pages/StartTrial";
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
        <Route path="/" element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/start-trial" element={<StartTrial />} />

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

function AnalyticsLoader() {
  const location = useLocation();

  // Load GA4 script on mount if already consented, and re-check when consent changes
  useEffect(() => {
    if (getConsentStatus() === "accepted") loadGoogleAnalytics();

    const handler = (e: Event) => {
      const { status } = (e as CustomEvent<{ status: ConsentStatus }>).detail;
      if (status === "accepted") loadGoogleAnalytics();
    };
    window.addEventListener("cookie-consent-changed", handler);
    return () => window.removeEventListener("cookie-consent-changed", handler);
  }, []);

  // Track page views on every route change (SPA navigation)
  // Fires on mount too — acceptable duplicate on initial load per product decision
  useEffect(() => {
    if (getConsentStatus() !== "accepted") return;
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
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
                      <AnalyticsLoader />
                      <SubscriptionActivatingGuard />
                      <CookieConsentBanner />
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
