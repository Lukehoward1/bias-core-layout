// src/pages/CancelSubscription.tsx
// In-app cancellation: shows what the subscriber loses, captures a reason
// (required) + optional free-text feedback, then calls cancel-subscription
// which sets cancel_at_period_end. No Stripe portal handoff.

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, AlertCircle, RefreshCw, XCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { featuresLostOnCancel } from "@/data/planFeatures";
import {
  type SubscriptionState,
  fetchSubscriptionState,
  cancelSubscription,
} from "@/lib/stripe";

const REASONS: Array<{ value: string; label: string }> = [
  { value: "too_expensive",       label: "Too expensive" },
  { value: "not_using_enough",    label: "Not using it enough" },
  { value: "missing_feature",     label: "Missing a feature I need" },
  { value: "switched_competitor", label: "Switched to a competitor" },
  { value: "technical_issues",    label: "Technical issues" },
  { value: "other",               label: "Other" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try { return format(new Date(iso), "d MMMM yyyy"); }
  catch { return iso; }
}

export default function CancelSubscription() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reason, setReason] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [done, setDone] = useState<{ accessUntil: string | null } | null>(null);

  const token = session?.access_token ?? null;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const s = await fetchSubscriptionState(token);
      setState(s);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleConfirmCancel = async () => {
    if (!token || !reason) return;
    setCancelling(true);
    try {
      const result = await cancelSubscription(token, reason, feedback.trim() || undefined);
      setDone({ accessUntil: result.accessUntil });
      setConfirmOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="p-6 space-y-6">
        <AppHeader title="Cancel Subscription" />
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <XCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground">Subscription cancelled</p>
                <p className="text-sm text-muted-foreground">
                  You'll keep access until <strong>{formatDate(done.accessUntil)}</strong>.
                  Thanks for the feedback — we read every note.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" onClick={() => navigate("/settings")}>Back to Settings</Button>
                <Button onClick={() => navigate("/dashboard")}>Continue to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Guarded states ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <AppHeader title="Cancel Subscription" />
        <div className="max-w-2xl mx-auto flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading subscription…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <AppHeader title="Cancel Subscription" />
        <div className="max-w-2xl mx-auto">
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!state?.tier) {
    return (
      <div className="p-6 space-y-6">
        <AppHeader title="Cancel Subscription" />
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">You don't have an active subscription to cancel.</p>
              <Button variant="outline" onClick={() => navigate("/settings")}>Back to Settings</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state.cancelAtPeriodEnd) {
    return (
      <div className="p-6 space-y-6">
        <AppHeader title="Cancel Subscription" />
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6 space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Your subscription is already set to cancel on {formatDate(state.currentPeriodEnd)}.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={() => navigate("/settings")}>Back to Settings</Button>
                <Button onClick={() => navigate("/settings/subscription")}>Reactivate…</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  const lostFeatures = featuresLostOnCancel(state.tier);
  const isFoundingMember = state.tier === "founding_member";

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Cancel Subscription" />

      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        {/* What you'll lose */}
        <Card>
          <CardHeader>
            <CardTitle>Before you go</CardTitle>
            <CardDescription>
              You'll keep access until <strong>{formatDate(state.currentPeriodEnd)}</strong>.
              After that, you'll lose access to:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isFoundingMember && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-warning/30 bg-warning/5">
                <Star className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Your Founding Member price is locked forever — for now.</p>
                  <p className="text-muted-foreground">
                    If you cancel and re-subscribe later, you'll pay the current published price, not your grandfathered rate.
                  </p>
                </div>
              </div>
            )}

            <ul className="space-y-2 text-sm">
              {lostFeatures.map((f) => (
                <li key={f.key} className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground">
                    {f.label}
                    {typeof f[state.tier === "standard" ? "standard" : "pro"] === "string" && (
                      <span className="text-muted-foreground"> — {f[state.tier === "standard" ? "standard" : "pro"]}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Reason */}
        <Card>
          <CardHeader>
            <CardTitle>Help us understand</CardTitle>
            <CardDescription>Why are you cancelling? (required)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={reason} onValueChange={setReason}>
              {REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                  <Label htmlFor={`reason-${r.value}`} className="text-sm font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="space-y-2 pt-2">
              <Label htmlFor="feedback" className="text-sm">
                How could we improve, or what features should we build? (optional)
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Anything you'd like us to know…"
                rows={4}
                maxLength={2000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate("/settings")}>Keep my subscription</Button>
          <Button
            variant="destructive"
            disabled={!reason || cancelling}
            onClick={() => setConfirmOpen(true)}
          >
            Continue to Cancellation
          </Button>
        </div>
      </div>

      {/* Final confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until <strong>{formatDate(state.currentPeriodEnd)}</strong>,
              then cancel automatically. You can reactivate from Settings any time before that date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Never mind</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling…" : "Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
