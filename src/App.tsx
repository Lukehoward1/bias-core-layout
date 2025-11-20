import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AppLayout } from "@/layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import Calendar from "./pages/Calendar";
import NewsTimers from "./pages/NewsTimers";
import RiskTools from "./pages/RiskTools";
import Journal from "./pages/Journal";
import StrategyTester from "./pages/StrategyTester";
import Community from "./pages/Community";
import Education from "./pages/Education";
import Webinars from "./pages/Webinars";
import BrokerConnections from "./pages/BrokerConnections";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/markets" element={<Markets />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/news-timers" element={<NewsTimers />} />
              <Route path="/risk-tools" element={<RiskTools />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/strategy-tester" element={<StrategyTester />} />
              <Route path="/community" element={<Community />} />
              <Route path="/education" element={<Education />} />
              <Route path="/webinars" element={<Webinars />} />
              <Route path="/broker-connections" element={<BrokerConnections />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/billing" element={<Billing />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
