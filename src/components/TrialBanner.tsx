import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

const DISMISS_KEY = "trial_banner_dismissed";

export function TrialBanner() {
  const navigate = useNavigate();
  const { isTrial, trialEndsAt } = useSubscription();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1",
  );

  if (!isTrial || !trialEndsAt || dismissed) return null;

  const msRemaining = new Date(trialEndsAt).getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-sm">
      <p className="text-foreground">
        <span className="font-semibold text-primary">
          {daysRemaining === 0 ? "Your trial expires today" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left on your free trial`}
        </span>
        {" — upgrade to keep access."}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" className="h-7 px-3 text-xs" onClick={() => navigate("/pricing")}>
          Upgrade Now
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
