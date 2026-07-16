import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No session yet — wait for the hash to be processed
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY") {
            // Recovery token processed here — send to the reset form, not the app
            subscription.unsubscribe();
            navigate("/reset-password", { replace: true });
            return;
          }
          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe();
            handleSession(session.user.id, session.user.email ?? "");
          }
        });
        return;
      }

      // Session already established — check if it's a recovery token
      if (window.location.hash.includes("type=recovery")) {
        navigate("/reset-password", { replace: true });
        return;
      }

      handleSession(session.user.id, session.user.email ?? "");
    });

    async function handleSession(userId: string, email: string) {
      const pending = localStorage.getItem("pendingCheckout");

      if (pending) {
        const pendingPriceId = localStorage.getItem("pendingPriceId") ?? "";
        const pendingFounding = localStorage.getItem("pendingFounding") ?? "false";
        localStorage.removeItem("pendingCheckout");
        localStorage.removeItem("pendingUserId");
        localStorage.removeItem("pendingEmail");
        localStorage.removeItem("pendingPriceId");
        localStorage.removeItem("pendingFounding");

        let url = "/start-trial?userId=" + userId + "&email=" + encodeURIComponent(email);
        if (pendingPriceId) url += "&priceId=" + encodeURIComponent(pendingPriceId);
        if (pendingFounding === "true") url += "&founding=true";
        navigate(url);
        return;
      }

      // No pending checkout — check if they have a subscription
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", userId)
        .maybeSingle();

      const isActive = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
      navigate(isActive ? "/dashboard" : "/pricing");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}
