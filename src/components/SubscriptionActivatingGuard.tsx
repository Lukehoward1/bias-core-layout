import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function SubscriptionActivatingGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive } = useSubscription();
  const { toast } = useToast();
  const { user } = useAuth();
  const isPostPayment = new URLSearchParams(location.search).get("subscription") === "success";
  const attempts = useRef(0);
  const shown = useRef(false);

  useEffect(() => {
    if (!isPostPayment) return;
    if (isActive && !shown.current) {
      shown.current = true;
      toast({ title: "Welcome to StreamBias!", description: "Your 7-day free trial has started." });
      navigate("/dashboard", { replace: true });
    }
  }, [isActive, isPostPayment, navigate, toast]);

  useEffect(() => {
    if (!isPostPayment || isActive || !user) return;

    let cancelled = false;

    const poll = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const interval = setInterval(async () => {
        attempts.current += 1;
        if (attempts.current > 10) {
          clearInterval(interval);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", session.user.id)
          .maybeSingle();

        if (data?.subscription_status === "active" || data?.subscription_status === "trialing") {
          clearInterval(interval);
          if (!shown.current && !cancelled) {
            shown.current = true;
            toast({ title: "Welcome to StreamBias!", description: "Your 7-day free trial has started." });
            navigate("/dashboard", { replace: true });
          }
        }
      }, 1500);

      return () => clearInterval(interval);
    };

    poll();
    return () => { cancelled = true; };
  }, [isPostPayment, isActive, user, navigate, toast]);

  if (isPostPayment && !isActive && attempts.current < 10) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Setting up your account...</p>
      </div>
    );
  }

  return null;
}
