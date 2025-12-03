import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Flame, Zap, BarChart3, Bell, TrendingUp, Monitor, Users } from "lucide-react";

export default function Billing() {
  const [heroEmail, setHeroEmail] = useState("");
  const [footerEmail, setFooterEmail] = useState("");

  const plans = [
    {
      name: "Basic",
      subtitle: "Entry / Core",
      price: "£40",
      period: "/month",
      features: [
        "Core market overview",
        "Essential tools",
        "Basic insights",
        "Limited alerts",
        "Community access",
        "Standard support",
      ],
      cta: "Join Waiting List",
      highlighted: false,
      comingSoon: false,
    },
    {
      name: "Premium",
      subtitle: "Advanced",
      price: "£60",
      period: "/month",
      features: [
        "Everything in Basic",
        "Full market deep-dives",
        "Advanced analytics",
        "All alerts + custom alerts",
        "Smart tools / automations",
        "Early access to new features",
        "Priority support",
      ],
      cta: "Join Waiting List",
      highlighted: true,
      badge: "Most Popular",
      comingSoon: false,
    },
    {
      name: "Enterprise",
      subtitle: "Teams & Scale",
      price: "£120",
      period: "/month",
      features: [
        "Everything in Premium",
        "Team / multi-user access",
        "Advanced analytics suite",
        "API access",
        "Dedicated onboarding",
        "Priority customer success manager",
      ],
      cta: "Contact Us",
      highlighted: false,
      badge: "Coming Soon",
      comingSoon: true,
    },
  ];

  const featureGrid = [
    { icon: TrendingUp, title: "Real-time market insights", description: "Stay ahead with live data and analysis" },
    { icon: Zap, title: "Automated smart tools", description: "Let AI handle the heavy lifting" },
    { icon: BarChart3, title: "Portfolio monitoring", description: "Track performance at a glance" },
    { icon: Bell, title: "Trends & sentiment", description: "Understand market mood instantly" },
    { icon: Monitor, title: "Deep-dive analysis pages", description: "Comprehensive research tools" },
    { icon: Users, title: "Desktop & mobile access", description: "Trade anywhere, anytime" },
  ];

  const launchOfferBullets = [
    "All Premium features",
    "Lifetime locked-in pricing",
    "Exclusive early access",
    "Priority onboarding",
  ];

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Subscriptions" />
      <div className="flex-1 overflow-y-auto bg-background">
        {/* Launch Offer Banner - Top of Page */}
        <section className="px-6 pt-6 pb-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-5 py-3 text-center">
              <Flame className="h-4 w-4 shrink-0 text-orange-500" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Launch Offer:</span>{" "}
                <span className="text-muted-foreground">First 100 users get Premium for £29.99/month equivalent — billed annually (£359.88/year). Lifetime locked-in pricing.</span>
              </p>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="px-6 py-8 md:py-10">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Subscriptions & Pricing
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Simple, transparent plans. No hidden fees.
            </p>
            <p className="mt-1 text-sm text-muted-foreground/80">
              Join the waiting list to secure early access and launch pricing.
            </p>
            <div className="mt-5 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
              <Input
                type="email"
                placeholder="Enter your email"
                value={heroEmail}
                onChange={(e) => setHeroEmail(e.target.value)}
                className="h-9 w-full max-w-xs bg-card"
              />
              <Button size="sm" className="w-full sm:w-auto">
                Join Waiting List
              </Button>
            </div>
          </div>
        </section>

        {/* Pricing Table */}
        <section className="px-6 pb-10">
          <div className="max-w-5xl mx-auto">
            <div className="grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col ${
                    plan.highlighted
                      ? "border-primary bg-card ring-1 ring-primary/30"
                      : plan.comingSoon
                      ? "border-border bg-card/60 opacity-70"
                      : "border-border bg-card"
                  }`}
                >
                  {plan.badge && (
                    <Badge 
                      className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs px-2.5 py-0.5 ${
                        plan.comingSoon 
                          ? "bg-muted text-muted-foreground border-0" 
                          : "bg-primary text-primary-foreground border-0"
                      }`}
                    >
                      {plan.badge}
                    </Badge>
                  )}
                  <CardHeader className="text-center pt-6 pb-4">
                    <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">{plan.subtitle}</CardDescription>
                    <div className="mt-3">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col px-5 pb-6">
                    <ul className="mb-5 flex-1 space-y-2.5">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      size="sm"
                      variant={plan.highlighted ? "default" : "outline"}
                      disabled={plan.comingSoon}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Launch Offer Card - Full Width */}
        <section className="px-6 pb-10">
          <div className="max-w-5xl mx-auto">
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
              <CardContent className="py-8 px-6 md:px-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary mb-3">
                      <Flame className="h-3.5 w-3.5" />
                      First 100 Users Only
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Premium for £29.99/month
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Billed annually at £359.88. Lifetime locked-in price.
                    </p>
                    <ul className="mt-4 flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-1.5">
                      {launchOfferBullets.map((bullet, index) => (
                        <li key={index} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-shrink-0 text-center md:text-right">
                    <Button size="default" className="px-6">
                      Claim Launch Offer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="px-6 pb-10">
          <div className="max-w-5xl mx-auto">
            <h2 className="mb-6 text-center text-xl font-semibold text-foreground">
              Everything you need to succeed
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featureGrid.map((feature, index) => (
                <Card key={index} className="border-border bg-card">
                  <CardContent className="flex items-start gap-3.5 py-4 px-4">
                    <div className="rounded-md bg-primary/10 p-2">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{feature.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="px-6 py-10 border-t border-border">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Secure early access
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Join the waiting list today and be first in line.
            </p>
            <div className="mt-4 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
              <Input
                type="email"
                placeholder="Enter your email"
                value={footerEmail}
                onChange={(e) => setFooterEmail(e.target.value)}
                className="h-9 w-full max-w-xs bg-card"
              />
              <Button size="sm" className="w-full sm:w-auto">
                Join Waiting List
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}