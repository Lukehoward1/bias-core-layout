import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createCheckoutSession, PRICE_IDS } from "@/lib/stripe";

export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    async function redirect(userId: string, userEmail: string) {
      if (handled.current) return;
      handled.current = true;

      const pending = localStorage.getItem("pendingCheckout");
      if (pending) {
        const storedUserId = localStorage.getItem("pendingUserId") ?? userId;
        const storedEmail = localStorage.getItem("pendingEmail") ?? userEmail;
        localStorage.removeItem("pendingCheckout");
        localStorage.removeItem("pendingUserId");
        localStorage.removeItem("pendingEmail");
        try {
          await createCheckoutSession(PRICE_IDS.STANDARD_MONTHLY, storedUserId, storedEmail, false);
        } catch {
          navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    }

    // Supabase processes the URL token on load and fires SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        redirect(session.user.id, session.user.email ?? "");
      }
    });

    // Fallback: session may already be set if URL hash was processed synchronously
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirect(session.user.id, session.user.email ?? "");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}
