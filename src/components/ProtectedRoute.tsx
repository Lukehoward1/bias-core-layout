import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function ProtectedRoute() {
  const { user, isLoading: authLoading, isPasswordRecovery } = useAuth();
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

  console.log("[ProtectedRoute] isPasswordRecovery:", isPasswordRecovery, "| user:", user?.email ?? "null", "| path:", location.pathname);

  if (!user) return <Navigate to="/login" replace />;

  // Recovery sessions must only reach /reset-password — never the app shell.
  // This catches any path that lands a recovery token on a protected route
  // (e.g. if the Supabase redirect URL points at /auth/callback instead of /reset-password).
  if (isPasswordRecovery) return <Navigate to="/reset-password" replace />;

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
