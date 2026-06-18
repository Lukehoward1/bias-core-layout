import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import sbLogo from "@/assets/sb-logo.svg";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  // DEBUG
  console.log("[ResetPassword] mounted — href:", window.location.href, "| hash:", window.location.hash, "| search:", window.location.search);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    console.log("[ResetPassword] useEffect — hash at effect time:", JSON.stringify(hash));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log("[ResetPassword] onAuthStateChange fired:", event);
      if (event === "PASSWORD_RECOVERY") {
        setHasToken(true);
      }
    });

    if (hash.includes("access_token")) {
      console.log("[ResetPassword] access_token found in hash — setting hasToken=true");
      setHasToken(true);
    } else {
      console.log("[ResetPassword] NO access_token in hash — starting 800ms fallback timer");
      const timer = setTimeout(() => {
        setHasToken((prev) => {
          console.log("[ResetPassword] 800ms timer fired — hasToken was:", prev, "→ setting to false if still null");
          return prev === null ? false : prev;
        });
      }, 800);
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (hasToken === false) {
      console.log("[ResetPassword] hasToken=false — redirecting to /login");
      navigate("/login", { replace: true });
    }
  }, [hasToken, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      navigate("/login", { state: { passwordReset: true } });
    }
  }

  if (hasToken === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={sbLogo} alt="StreamBias" className="h-12 w-auto" />
          <span className="text-2xl font-bold text-foreground">StreamBias</span>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Set new password</CardTitle>
            <CardDescription>Choose a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
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
                <Label htmlFor="confirm">Confirm new password</Label>
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
