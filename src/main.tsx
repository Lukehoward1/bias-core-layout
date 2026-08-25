import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

import { MarketDataProvider } from "@/context/MarketDataProvider";

// TEMP DIAGNOSTIC — remove after preview env-var investigation
// Vite bakes import.meta.env values at build time. This literal is unconditional
// so the build tool cannot tree-shake it — the raw substituted value will end
// up next to __CAL_FIX_DIAG_MARKER__ in the bundle, letting us grep the CDN
// response to see exactly what Vercel injected during the build.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__CAL_FIX_DIAG_MARKER__ = {
  VITE_USE_CALENDAR_FIXTURES: import.meta.env.VITE_USE_CALENDAR_FIXTURES,
  DEV: import.meta.env.DEV,
  MODE: import.meta.env.MODE,
};

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <MarketDataProvider>
      <App />
    </MarketDataProvider>
  </BrowserRouter>,
);
