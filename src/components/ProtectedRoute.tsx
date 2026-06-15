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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Allow through on post-payment redirect — subscription context may not have loaded yet
  if (isPostPayment) return <Outlet />;

  // Still loading subscription — show spinner rather than redirecting
  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isActive && location.pathname !== "/") return <Navigate to="/pricing" replace />;

  return <Outlet />;
}
