import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// ✅ Global provider (wrap once)
import { ActiveTradingAccountProvider } from "@/context/ActiveTradingAccountProvider";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ActiveTradingAccountProvider>
      <App />
    </ActiveTradingAccountProvider>
  </BrowserRouter>,
);
