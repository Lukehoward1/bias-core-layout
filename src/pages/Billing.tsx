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
        {/* Hero Section */}
        <section className="px-6 py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Subscriptions & Pricing
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Simple, transparent plans. No hidden fees.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Join the waiting list to secure early access and launch pricing.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Input
                type="email"
                placeholder="Enter your email"
                value={heroEmail}
                onChange={(e) => setHeroEmail(e.target.value)}
                className="h-10 w-full max-w-sm bg-card"
              />
              <Button size="default" className="w-full sm:w-auto">
                Join Waiting List
              </Button>
            </div>
          </div>
        </section>

        {/* Launch Offer Banner */}
        <section className="px-6">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 text-center">
              <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                <Flame className="h-5 w-5 text-orange-500" />
                <span>
                  <strong>Launch Offer:</strong> First 100 users get Premium for £29.99/month equivalent — billed annually (£359.88/year). Lifetime locked-in pricing.
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Table */}
        <section className="px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col ${
                    plan.highlighted
                      ? "border-primary bg-card ring-2 ring-primary/20"
                      : plan.comingSoon
                      ? "border-border bg-card/50 opacity-75"
                      : "border-border bg-card"
                  }`}
                >
                  {plan.badge && (
                    <Badge 
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 ${
                        plan.comingSoon 
                          ? "bg-muted text-muted-foreground" 
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {plan.badge}
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">{plan.subtitle}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="mb-6 flex-1 space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
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

        {/* Launch Offer Card */}
        <section className="px-6 pb-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="py-8 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 text-sm font-medium text-primary">
                  <Flame className="h-4 w-4" />
                  First 100 Users Only
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  Premium for £29.99/month
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Billed annually at £359.88. Lifetime locked-in price.
                </p>
                <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
                  {launchOfferBullets.map((bullet, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="mt-6">
                  Claim Launch Offer
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="bg-muted/30 px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
              Everything you need to succeed
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featureGrid.map((feature, index) => (
                <Card key={index} className="border-border bg-card">
                  <CardContent className="flex items-start gap-4 py-5">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Secure early access
            </h2>
            <p className="mt-2 text-muted-foreground">
              Join the waiting list today and be first in line.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Input
                type="email"
                placeholder="Enter your email"
                value={footerEmail}
                onChange={(e) => setFooterEmail(e.target.value)}
                className="h-10 w-full max-w-sm bg-card"
              />
              <Button size="default" className="w-full sm:w-auto">
                Join Waiting List
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
