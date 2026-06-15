import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createCheckoutSession, PRICE_IDS } from "@/lib/stripe";

export default function StartTrial() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!userId || !email) {
      navigate("/pricing");
      return;
    }

    createCheckoutSession(PRICE_IDS.STANDARD_MONTHLY, userId, email, false)
      .catch(() => {
        setError(true);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Something went wrong setting up your trial.</p>
        <button onClick={() => navigate("/pricing")} className="text-primary underline">Go to pricing</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Setting up your free trial...</p>
    </div>
  );
}
