import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { createCheckoutSession, PRICE_IDS } from "@/lib/stripe";
import sbLogo from "@/assets/sb-logo.svg";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trialSetup, setTrialSetup] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setIsLoading(false);
      setError(authError.message);
      return;
    }
    if (!data.user) {
      setIsLoading(false);
      setError("Account creation failed. Please try again.");
      return;
    }

    if (!data.session) {
      // Email confirmation is ON — store checkout intent, show confirmation message
      localStorage.setItem("pendingCheckout", "true");
      localStorage.setItem("pendingUserId", data.user.id);
      localStorage.setItem("pendingEmail", email);
      setIsLoading(false);
      setNeedsConfirmation(true);
      return;
    }

    // Email confirmation is OFF — user is already signed in, go straight to Stripe
    setTrialSetup(true);
    try {
      await createCheckoutSession(
        PRICE_IDS.STANDARD_MONTHLY,
        data.user.id,
        data.user.email ?? email,
        false,
      );
    } catch {
      navigate("/dashboard");
    }
  }

  if (needsConfirmation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <button type="button" onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </button>
          <div className="flex flex-col items-center gap-3">
            <img src={sbLogo} alt="StreamBias" className="h-12 w-auto" />
            <span className="text-2xl font-bold text-foreground">StreamBias</span>
          </div>
          <Card>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Check your email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-success bg-success/10 rounded-md px-3 py-3 text-center">
                Check your email to confirm your account. Once confirmed, you'll be taken to complete your trial setup.
              </p>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Back to sign in
                </Link>
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
        <div className="flex flex-col items-center gap-3">
          <img src={sbLogo} alt="StreamBias" className="h-12 w-auto" />
          <span className="text-2xl font-bold text-foreground">StreamBias</span>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Create account</CardTitle>
            <CardDescription>Start your StreamBias journey</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || trialSetup}>
                {trialSetup ? "Setting up your trial…" : isLoading ? "Creating account…" : "Create Account"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
