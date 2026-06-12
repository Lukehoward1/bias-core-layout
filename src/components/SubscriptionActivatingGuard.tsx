import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export function SubscriptionActivatingGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const ran = useRef(false);

  const isPostPayment =
    location.pathname === "/dashboard" &&
    new URLSearchParams(location.search).get("subscription") === "success";

  useEffect(() => {
    if (!isPostPayment || ran.current) return;
    ran.current = true;

    // Just clean the URL and show the welcome toast immediately
    // The profile already exists in Supabase (webhook fired before redirect)
    // SubscriptionContext will pick it up on its normal load
    toast({
      title: "Welcome to StreamBias!",
      description: "Your 7-day free trial has started.",
    });
    navigate("/dashboard", { replace: true });
  }, [isPostPayment, navigate, toast]);

  return null;
}
