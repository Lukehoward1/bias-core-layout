import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AlertsProvider } from "@/contexts/AlertsContext";
import { GlobalNotifications } from "@/components/alerts/GlobalNotifications";
import { AppLayout } from "@/layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import AssetDetail from "./pages/AssetDetail";
import Calendar from "./pages/Calendar";
import Alerts from "./pages/Alerts";
import RiskTools from "./pages/RiskTools";
import Journal from "./pages/Journal";
import StrategyTester from "./pages/StrategyTester";
import ManualBacktesting from "./pages/ManualBacktesting";
import AutomatedStrategyLab from "./pages/AutomatedStrategyLab";
import FundingChallengeSim from "./pages/FundingChallengeSim";
import Community from "./pages/Community";
import Education from "./pages/Education";
import Webinars from "./pages/Webinars";

import Brokerage from "./pages/Brokerage";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <AlertsProvider>
          <Toaster />
          <Sonner />
          <GlobalNotifications />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/risk-tools" element={<RiskTools />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/strategy-tester" element={<StrategyTester />} />
                <Route path="/strategy/manual" element={<ManualBacktesting />} />
                <Route path="/strategy/auto" element={<AutomatedStrategyLab />} />
                <Route path="/strategy/funding" element={<FundingChallengeSim />} />
                <Route path="/community" element={<Community />} />
                <Route path="/education" element={<Education />} />
                <Route path="/webinars" element={<Webinars />} />
                
                <Route path="/brokerage" element={<Brokerage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/billing" element={<Billing />} />
              </Route>
              {/* Full-screen Asset Detail (no sidebar) */}
              <Route path="/asset/:symbol" element={<AssetDetail />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AlertsProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
