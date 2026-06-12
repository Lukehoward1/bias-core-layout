import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";

export function SubscriptionActivatingGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isActive, refetch } = useSubscription();
  const { toast } = useToast();
  const isPostPayment = new URLSearchParams(location.search).get("subscription") === "success";
  const attempts = useRef(0);
  const shown = useRef(false);

  useEffect(() => {
    if (!isPostPayment) return;
    if (isActive && !shown.current) {
      shown.current = true;
      toast({ title: "Welcome to StreamBias!", description: "Your 7-day free trial has started." });
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!isActive && attempts.current < 10) {
      attempts.current += 1;
      const timer = setTimeout(() => refetch(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive, isPostPayment, refetch, navigate, toast]);

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
