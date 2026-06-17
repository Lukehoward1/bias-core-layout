import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getConsentStatus, setConsentStatus, ConsentStatus } from "@/lib/cookieConsent";

export function CookieConsentBanner() {
  const [status, setStatus] = useState<ConsentStatus>("unset");

  useEffect(() => {
    setStatus(getConsentStatus());

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ status: ConsentStatus }>).detail;
      setStatus(detail.status);
    };
    window.addEventListener("cookie-consent-changed", handler);
    return () => window.removeEventListener("cookie-consent-changed", handler);
  }, []);

  if (status !== "unset") return null;

  function accept() {
    setConsentStatus("accepted");
    setStatus("accepted");
  }

  function reject() {
    setConsentStatus("rejected");
    setStatus("rejected");
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="rounded-lg border border-border bg-card shadow-lg px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <p className="text-sm text-muted-foreground flex-1">
            We use essential cookies to run StreamBias, and (with your consent) analytics cookies
            to understand site usage.{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={reject}>
              Reject
            </Button>
            <Button size="sm" onClick={accept}>
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
