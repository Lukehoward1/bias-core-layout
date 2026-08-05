import { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function DowngradeBanner() {
  const { downgradeGraceEndAt, downgradeNewMax, refetch } = useSubscription();
  const { accounts, reloadAccounts } = useLinkedAccounts();
  const { session } = useAuth();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!downgradeGraceEndAt) return null;

  const deadline = new Date(downgradeGraceEndAt);
  if (deadline < new Date()) return null;

  const deadlineLabel = deadline.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleConfirm() {
    if (!chosenId || !session) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/broker-downgrade-resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ chosenLinkedAccountId: chosenId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to resolve downgrade");
      }
      toast.success("Account selection saved. Other accounts have been disconnected.");
      await reloadAccounts();
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-3 text-sm">
      <div className="flex items-start gap-3 max-w-4xl">
        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground mb-1">
            Action required: choose which account to keep
          </p>
          <p className="text-muted-foreground mb-3">
            Your plan now allows {downgradeNewMax ?? 1} broker account. Select which account to keep
            by <span className="font-medium text-foreground">{deadlineLabel}</span> — after that
            we'll automatically keep your primary account and disconnect the rest.
          </p>

          {accounts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setChosenId(account.id)}
                  className={[
                    "px-3 py-1.5 rounded-md border text-sm transition-colors",
                    chosenId === account.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:border-primary/50",
                  ].join(" ")}
                >
                  {account.name}
                </button>
              ))}
            </div>
          )}

          <Button
            size="sm"
            disabled={!chosenId || submitting}
            onClick={handleConfirm}
            className="gap-2"
          >
            {submitting && <RefreshCw className="h-3 w-3 animate-spin" />}
            {submitting ? "Saving…" : "Confirm selection"}
          </Button>
        </div>
      </div>
    </div>
  );
}
