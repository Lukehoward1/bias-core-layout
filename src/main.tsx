import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

import { ActiveTradingAccountProvider } from "@/context/ActiveTradingAccountProvider";
import { MarketDataProvider } from "@/context/MarketDataProvider";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ActiveTradingAccountProvider>
      <MarketDataProvider>
        <App />
      </MarketDataProvider>
    </ActiveTradingAccountProvider>
  </BrowserRouter>,
);
