import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getConsentStatus, setConsentStatus, ConsentStatus } from "@/lib/cookieConsent";
import { loadGoogleAnalytics } from "@/lib/analytics";

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
    loadGoogleAnalytics();
  }

  function reject() {
    setConsentStatus("rejected");
    setStatus("rejected");
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="rounded-lg border border-border bg-card shadow-lg px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Essential cookies</span> (authentication, checkout) are always active — they're required for StreamBias to function.
            </p>
            <p className="text-sm text-muted-foreground">
              We'd also like to use <span className="font-medium text-foreground">analytics cookies</span> to understand how visitors use StreamBias. You can change this anytime via Cookie Settings in the footer.{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={reject}>
              Reject Analytics
            </Button>
            <Button size="sm" onClick={accept}>
              Accept Analytics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
