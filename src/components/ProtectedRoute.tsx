import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function ProtectedRoute() {
  const { user, isLoading: authLoading } = useAuth();
  const { isActive, isLoading: subLoading } = useSubscription();
  const location = useLocation();

  const isPostPayment =
    location.pathname === "/dashboard" &&
    new URLSearchParams(location.search).get("subscription") === "success";

  if (authLoading || (subLoading && !isPostPayment)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // On post-payment, always allow through — subscription context will load shortly
  if (isPostPayment) return <Outlet />;

  if (!isActive) return <Navigate to="/pricing" replace />;

  return <Outlet />;
}
