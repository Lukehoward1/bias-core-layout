import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { createCheckoutSession, PRICE_IDS } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import sbLogo from "@/assets/sb-logo.svg";

type View = "signin" | "forgot" | "forgot-sent";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const subscriptionSuccess = new URLSearchParams(location.search).get("subscription") === "success";
  const [view, setView] = useState<View>("signin");

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInError(null);
    setSignInLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSignInLoading(false);
      setSignInError(error.message);
      return;
    }
    const user = data.user;
    if (!user) { navigate("/pricing"); return; }

    // Email confirmation flow: pending checkout stored before email was confirmed
    const pending = localStorage.getItem("pendingCheckout");
    if (pending) {
      if (!subscriptionSuccess) {
        // Checkout not yet done — redirect to Stripe
        const pendingUserId = localStorage.getItem("pendingUserId") ?? user.id;
        const pendingEmail = localStorage.getItem("pendingEmail") ?? user.email ?? "";
        localStorage.removeItem("pendingCheckout");
        localStorage.removeItem("pendingUserId");
        localStorage.removeItem("pendingEmail");
        try {
          await createCheckoutSession(PRICE_IDS.STANDARD_MONTHLY, pendingUserId, pendingEmail, false);
        } catch {
          navigate("/pricing");
        }
        return;
      }
      // Checkout already completed (?subscription=success) — just clean up
      localStorage.removeItem("pendingCheckout");
      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("pendingEmail");
    }

    // Fetch profile directly to determine destination
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    const status = (profile?.subscription_status ?? null) as string | null;
    const isActive = status === "active" || status === "trialing";
    navigate(isActive ? "/dashboard" : "/pricing");
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      setResetError(error.message);
    } else {
      setView("forgot-sent");
    }
  }

  const logo = (
    <div className="flex flex-col items-center gap-3">
      <img src={sbLogo} alt="StreamBias" className="h-12 w-auto" />
      <span className="text-2xl font-bold text-foreground">StreamBias</span>
    </div>
  );

  if (view === "forgot-sent") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <button type="button" onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </button>
          {logo}
          <Card>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Check your email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-success bg-success/10 rounded-md px-3 py-3 text-center">
                Password reset link sent — check your email.
              </p>
              <p className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setView("signin")}
                  className="text-primary hover:underline font-medium"
                >
                  Back to sign in
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <button type="button" onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </button>
          {logo}
          <Card>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Reset password</CardTitle>
              <CardDescription>Enter your email and we&apos;ll send a reset link</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                {resetError && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{resetError}</p>
                )}

                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? "Sending…" : "Send reset link"}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setView("signin")}
                  className="text-primary hover:underline font-medium"
                >
                  Back to sign in
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <button type="button" onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back to home
        </button>
        {logo}

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptionSuccess && (
              <p className="text-sm text-success bg-success/10 rounded-md px-3 py-3 text-center mb-4">
                Payment successful — sign in to access StreamBias.
              </p>
            )}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => { setResetEmail(email); setView("forgot"); }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {signInError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{signInError}</p>
              )}

              <Button type="submit" className="w-full" disabled={signInLoading}>
                {signInLoading ? "Signing you in…" : "Sign In"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
