// src/pages/ManageSubscription.tsx
// Standard ↔ Pro plan management. Founding Members see a locked state.
// Plan changes are scheduled for the next renewal date (no proration).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Check, X as XIcon, ChevronLeft, AlertCircle, Lock, RefreshCw, Star, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_FEATURES } from "@/data/planFeatures";
import {
  PRICE_IDS,
  type SubscriptionState,
  fetchSubscriptionState,
  scheduleSubscriptionChange,
  cancelScheduledChange,
  reactivateSubscription,
} from "@/lib/stripe";

const PLAN_PRICING = {
  standard: { monthly: "£29/month", annual: "£299/year" },
  pro:      { monthly: "£45/month", annual: "£495/year" },
} as const;

function targetPriceIdFor(currentTier: "standard" | "pro", cadence: "monthly" | "annual"): string {
  const target = currentTier === "standard" ? "pro" : "standard";
  if (target === "pro") return cadence === "annual" ? PRICE_IDS.PRO_ANNUAL : PRICE_IDS.PRO_MONTHLY;
  return cadence === "annual" ? PRICE_IDS.STANDARD_ANNUAL : PRICE_IDS.STANDARD_MONTHLY;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try { return format(new Date(iso), "d MMMM yyyy"); }
  catch { return iso; }
}

export default function ManageSubscription() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const isSwitchable = state?.tier === "standard" || state?.tier === "pro";
  const targetTier: "standard" | "pro" | null = isSwitchable && state
    ? (state.tier === "standard" ? "pro" : "standard")
    : null;

  const targetPriceId = useMemo(() => {
    if (!isSwitchable || !state?.cadence || !state.tier) return null;
    return targetPriceIdFor(state.tier as "standard" | "pro", state.cadence);
  }, [isSwitchable, state]);

  const handleScheduleChange = async () => {
    if (!token || !targetPriceId) return;
    setActionLoading(true);
    try {
      await scheduleSubscriptionChange(token, targetPriceId);
      toast.success("Plan change scheduled.");
      setConfirmOpen(false);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule change.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPending = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      await cancelScheduledChange(token);
      toast.success("Scheduled change cancelled.");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel scheduled change.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      await reactivateSubscription(token);
      toast.success("Subscription reactivated.");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reactivate.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Manage Subscription" />

      <div className="max-w-5xl mx-auto space-y-6">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading subscription…
          </div>
        )}

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </CardContent>
          </Card>
        )}

        {!loading && state && !state.tier && (
          <Card>
            <CardContent className="pt-6 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                You don't have an active subscription.
              </p>
              <Button onClick={() => navigate("/pricing")}>View Plans</Button>
            </CardContent>
          </Card>
        )}

        {!loading && state?.tier === "founding_member" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-warning" />
                <CardTitle>Founding Member</CardTitle>
              </div>
              <CardDescription>
                Your plan is grandfathered at a locked forever-price and can't be switched.
                Contact support for any changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                Renews on {formatDate(state.currentPeriodEnd)}
              </div>
              <Button variant="outline" onClick={() => navigate("/settings/cancel")}>
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && state && isSwitchable && (
          <>
            {/* Pending scheduled change — slim inline bar (matches TrialBanner shape) */}
            {state.pendingChange && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/10 border border-primary/20 rounded-md px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    Scheduled: switching to <span className="capitalize">{state.pendingChange.newTier}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Takes effect on {formatDate(state.pendingChange.effectiveAt)}. No charge until then.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs shrink-0"
                  disabled={actionLoading}
                  onClick={handleCancelPending}
                >
                  Cancel scheduled change
                </Button>
              </div>
            )}

            {/* Cancel-at-period-end banner — slim inline bar (mirrors pending-change banner above) */}
            {state.cancelAtPeriodEnd && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-warning/10 border border-warning/20 rounded-md px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Subscription set to cancel</p>
                  <p className="text-muted-foreground text-xs">
                    You'll keep access until {formatDate(state.currentPeriodEnd)}. Change your mind?
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs shrink-0"
                  disabled={actionLoading}
                  onClick={handleReactivate}
                >
                  Reactivate
                </Button>
              </div>
            )}

            {/* Plan comparison */}
            <div className="grid gap-6 md:grid-cols-2">
              <PlanCard
                planKey="standard"
                title="Standard"
                subtitle="Everything you need to trade with clarity."
                price={PLAN_PRICING.standard[state.cadence ?? "monthly"]}
                isCurrent={state.tier === "standard"}
                isTarget={targetTier === "standard"}
                actionLabel={targetTier === "standard" ? "Downgrade to Standard" : null}
                actionLoading={actionLoading}
                disabled={actionLoading || Boolean(state.pendingChange)}
                onAction={() => setConfirmOpen(true)}
              />
              <PlanCard
                planKey="pro"
                title="Pro"
                subtitle="For serious traders who want the full edge."
                price={PLAN_PRICING.pro[state.cadence ?? "monthly"]}
                isCurrent={state.tier === "pro"}
                isTarget={targetTier === "pro"}
                actionLabel={targetTier === "pro" ? "Upgrade to Pro" : null}
                actionLoading={actionLoading}
                disabled={actionLoading || Boolean(state.pendingChange)}
                onAction={() => setConfirmOpen(true)}
              />
            </div>

            {state.pendingChange && (
              <p className="text-xs text-muted-foreground text-center">
                You already have a pending change scheduled — cancel it above to switch to a different plan.
              </p>
            )}
          </>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {targetTier === "pro" ? "Upgrade to Pro?" : "Downgrade to Standard?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your plan will switch on <strong>{formatDate(state?.currentPeriodEnd ?? null)}</strong>,
              your next renewal date. There's no charge or credit today — you'll keep your
              current plan until then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Not now</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading} onClick={handleScheduleChange}>
              {actionLoading ? "Scheduling…" : "Confirm change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface PlanCardProps {
  planKey: "standard" | "pro";
  title: string;
  subtitle: string;
  price: string;
  isCurrent: boolean;
  isTarget: boolean;
  actionLabel: string | null;
  actionLoading: boolean;
  disabled: boolean;
  onAction: () => void;
}

function PlanCard({ planKey, title, subtitle, price, isCurrent, isTarget, actionLabel, actionLoading, disabled, onAction }: PlanCardProps) {
  return (
    <Card className={isCurrent ? "border-primary ring-2 ring-primary/20" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          {isCurrent && (
            <Badge className="bg-primary text-primary-foreground shrink-0">Current plan</Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground pt-2">{price}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {PLAN_FEATURES.map((f) => {
            const value = f[planKey];
            const has = value !== false;
            return (
              <li key={f.key} className="flex items-start gap-2">
                {has ? (
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                ) : (
                  <XIcon className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                )}
                <span className={has ? "text-foreground" : "text-muted-foreground/60 line-through"}>
                  {f.label}
                  {typeof value === "string" && <span className="text-muted-foreground"> — {value}</span>}
                </span>
              </li>
            );
          })}
        </ul>

        {isTarget && actionLabel && (
          <Button
            className="w-full"
            variant={planKey === "pro" ? "default" : "outline"}
            disabled={disabled}
            onClick={onAction}
          >
            {planKey === "pro" ? (
              <ArrowUpRight className="h-4 w-4 mr-1.5" />
            ) : (
              <ArrowDownRight className="h-4 w-4 mr-1.5" />
            )}
            {actionLoading ? "Working…" : actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
