import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { createPortalSession } from "@/lib/stripe";

const DISMISS_KEY = "trial_banner_dismissed_v2";

export function TrialBanner() {
  const { isTrial, trialEndsAt, stripeCustomerId } = useSubscription();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1",
  );
  const [portalLoading, setPortalLoading] = useState(false);

  if (!isTrial || !trialEndsAt || dismissed) return null;

  const trialEnd = new Date(trialEndsAt);
  const daysRemaining = Math.max(
    0,
    Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000),
  );
  const endDateLabel = trialEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  async function handleManageTrial() {
    if (!stripeCustomerId) return;
    setPortalLoading(true);
    try {
      await createPortalSession(stripeCustomerId);
    } finally {
      setPortalLoading(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-sm">
      <p className="text-foreground">
        <span className="font-semibold text-primary">
          {daysRemaining === 0
            ? "Your trial ends today"
            : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left in your free trial`}
        </span>
        {" — you won't be charged until "}
        <span className="font-medium">{endDateLabel}</span>
        {". Cancel anytime in billing settings."}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs"
          disabled={portalLoading || !stripeCustomerId}
          onClick={handleManageTrial}
        >
          {portalLoading ? "Loading…" : "Manage Trial"}
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
