import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";

import { AlertsProvider } from "@/contexts/AlertsContext";

createRoot(document.getElementById("root")!).render(
  <AlertsProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AlertsProvider>,
);
