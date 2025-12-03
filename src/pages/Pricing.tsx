import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Flame, Zap, BarChart3, Bell, TrendingUp, Monitor, Users, Headphones } from "lucide-react";

const Pricing = () => {
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
    },
  ];

  const featureGrid = [
    { icon: TrendingUp, title: "Real-time market insights", description: "Stay ahead with live data and analysis" },
    { icon: Zap, title: "Automated smart tools", description: "Let AI handle the heavy lifting" },
    { icon: BarChart3, title: "Portfolio monitoring", description: "Track performance at a glance" },
    { icon: Bell, title: "Trends & sentiment", description: "Understand market mood instantly" },
    { icon: Monitor, title: "Deep-dive analysis", description: "Comprehensive research tools" },
    { icon: Users, title: "Desktop + mobile access", description: "Trade anywhere, anytime" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            Simple, transparent pricing. No surprises. Join the waiting list to secure early access.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Input
              type="email"
              placeholder="Enter your email"
              value={heroEmail}
              onChange={(e) => setHeroEmail(e.target.value)}
              className="h-11 w-full max-w-sm bg-card"
            />
            <Button size="lg" className="w-full sm:w-auto">
              Join Waiting List
            </Button>
          </div>
        </div>
      </section>

      {/* Launch Offer Banner */}
      <section className="px-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-6 py-4 text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground md:text-base">
              <Flame className="h-5 w-5 text-orange-500" />
              <span>
                <strong>Launch Offer:</strong> First 100 users get Premium for £29.99/month equivalent — billed annually (£359.88/year). Lifetime locked-in pricing.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Table */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-primary bg-card ring-2 ring-primary/20"
                    : "border-border bg-card"
                }`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
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
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-2xl">
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
              <Button size="lg" className="mt-6">
                Claim Launch Offer
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="bg-muted/30 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Everything you need to succeed
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureGrid.map((feature, index) => (
              <Card key={index} className="border-border bg-card">
                <CardContent className="flex items-start gap-4 py-6">
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
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Secure early access
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Join the waiting list today and be first in line.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Input
              type="email"
              placeholder="Enter your email"
              value={footerEmail}
              onChange={(e) => setFooterEmail(e.target.value)}
              className="h-11 w-full max-w-sm bg-card"
            />
            <Button size="lg" className="w-full sm:w-auto">
              Join Waiting List
            </Button>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} StreamBias. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
