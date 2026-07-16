import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createCheckoutSession, PRICE_IDS } from "@/lib/stripe";

// ── Types ──────────────────────────────────────────────────────────────────────

type Billing = "monthly" | "annual";

interface Plan {
  name: string;
  description: string;
  monthlyPrice: string;
  annualPrice: string;
  annualMonthly: string;
  annualSavings: string;
  features: string[];
  cta: string;
  priceIdMonthly: string;
  priceIdAnnual: string;
  highlighted: boolean;
  badge?: string;
  trial: boolean;
}

// ── Static plan definitions ────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    name: "Standard",
    description: "Everything you need to trade with clarity.",
    monthlyPrice: "£29",
    annualPrice: "£299",
    annualMonthly: "£24.92",
    annualSavings: "Save 14%",
    features: [
      "Live bias engine (all timeframes)",
      "Economic calendar (filtered by pairs)",
      "Risk tools & position calculator",
      "Trading journal with analytics",
      "Education library",
      "Price & session alerts",
    ],
    cta: "Start Free Trial",
    priceIdMonthly: PRICE_IDS.STANDARD_MONTHLY,
    priceIdAnnual: PRICE_IDS.STANDARD_ANNUAL,
    highlighted: false,
    trial: true,
  },
  {
    name: "Pro",
    description: "For serious traders who want the full edge.",
    monthlyPrice: "£45",
    annualPrice: "£495",
    annualMonthly: "£41.25",
    annualSavings: "Save 8%",
    features: [
      "Everything in Standard",
      "Broker sync & auto-journaling",
      "Advanced analytics & reports",
      "Deep aggregation & comparisons",
      "Priority support",
      "Early feature access",
    ],
    cta: "Start Free Trial",
    priceIdMonthly: PRICE_IDS.PRO_MONTHLY,
    priceIdAnnual: PRICE_IDS.PRO_ANNUAL,
    highlighted: true,
    badge: "Most Popular",
    trial: true,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  async function handleCheckout(priceId: string, isFoundingMember = false) {
    if (!user) {
      navigate(`/register?priceId=${encodeURIComponent(priceId)}&founding=${isFoundingMember}`);
      return;
    }
    setLoadingPriceId(priceId);
    try {
      await createCheckoutSession(priceId, user.id, user.email ?? "", isFoundingMember);
    } catch {
      setLoadingPriceId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <div className="px-6 pt-6 max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to home
        </button>
      </div>

      {/* Header */}
      <section className="text-center px-6 pt-12 pb-10 max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">Simple, clear pricing.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Start with a 7-day free trial. Card required — cancel before day 7 and you won't be charged.
        </p>

        {/* Monthly / Annual toggle */}
        <div className="mt-8 inline-flex items-center gap-1 bg-muted/50 border border-border rounded-full p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              billing === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              billing === "annual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
          </button>
        </div>
      </section>

      {/* Standard + Pro cards */}
      <section className="px-6 pb-10 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const priceId = billing === "monthly" ? plan.priceIdMonthly : plan.priceIdAnnual;
            const isLoading = loadingPriceId === priceId;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-primary bg-card ring-2 ring-primary/20"
                    : "border-border bg-card"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4">
                    {plan.badge}
                  </Badge>
                )}

                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {billing === "monthly" ? plan.monthlyPrice : plan.annualPrice}
                    </span>
                    <span className="text-muted-foreground mb-1 text-sm">
                      {billing === "monthly" ? "/month" : "/year"}
                    </span>
                  </div>
                  {billing === "annual" && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-success">{plan.annualMonthly}/month — billed annually</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/20 text-success font-bold">
                        {plan.annualSavings}
                      </span>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full h-11"
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={isLoading}
                  onClick={() => handleCheckout(priceId)}
                >
                  {isLoading ? "Redirecting…" : plan.cta}
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  7-day trial · Card required · Cancel before day 7 — no charge
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Founding Member card */}
      <section className="px-6 pb-20 max-w-2xl mx-auto">
        <div
          className="relative rounded-2xl border border-primary/30 p-8 text-center flex flex-col items-center gap-5"
          style={{
            background: "radial-gradient(ellipse at top, hsl(195 100% 50% / 0.07) 0%, transparent 70%)",
            boxShadow: "0 0 60px hsl(195 100% 50% / 0.06)",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase text-primary">Limited Offer</span>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Founding Member</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-md">
              Everything in Pro, locked in forever at half price. No trial — immediate payment.
            </p>
          </div>

          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-foreground">£299</span>
            <span className="text-muted-foreground mb-1 text-sm">/year</span>
          </div>

          <ul className="space-y-2 text-left w-full max-w-xs">
            {[
              "Everything in Pro",
              "Price locked forever",
              "Exclusive founding member badge",
              "Direct feedback line to founders",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <p className="text-sm text-muted-foreground">
            Limited to the first 100 founding members — spots are filling up.
          </p>

          <Button
            size="lg"
            className="h-12 px-10 font-semibold"
            disabled={loadingPriceId === PRICE_IDS.FOUNDING_MEMBER}
            onClick={() => handleCheckout(PRICE_IDS.FOUNDING_MEMBER, true)}
          >
            {loadingPriceId === PRICE_IDS.FOUNDING_MEMBER ? (
              "Redirecting…"
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Claim Your Spot
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            One-time annual payment · No trial · Renews at £299/year
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} StreamBias. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
