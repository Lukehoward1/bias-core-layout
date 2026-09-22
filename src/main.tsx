import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

import { MarketDataProvider } from "@/context/MarketDataProvider";
import { installClickSynthesizer } from "@/lib/click-synthesizer";

installClickSynthesizer();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <MarketDataProvider>
      <App />
    </MarketDataProvider>
  </BrowserRouter>,
);
