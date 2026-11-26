import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Pre-seed from URL hash so ProtectedRoute knows immediately, before onAuthStateChange fires
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() =>
    typeof window !== "undefined" && window.location.hash.includes("type=recovery")
  );
  // Track the signed-in user's ID so focus-triggered token refreshes (which fire
  // SIGNED_IN / TOKEN_REFRESHED with the same user) don't create a new User object
  // reference and cascade into SubscriptionContext re-fetching + page remounts.
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      currentUserIdRef.current = data.session?.user?.id ?? null;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      const incomingId = newSession?.user?.id ?? null;

      if (event === "PASSWORD_RECOVERY") {
        // Recovery session: expose the flag but still set the session so
        // ResetPassword can call updateUser() with a valid auth token.
        setIsPasswordRecovery(true);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        currentUserIdRef.current = incomingId;
      } else if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
        incomingId !== null &&
        incomingId === currentUserIdRef.current
      ) {
        // Same user refocusing the tab: Supabase refreshed the token but the
        // identity hasn't changed. Update the session so callers get a fresh
        // access_token, but skip setUser — keeping the existing User object
        // reference prevents SubscriptionContext from re-fetching and
        // ProtectedRoute from unmounting the page.
        setSession(newSession);
      } else {
        // Real sign-in, sign-out, user change, or first-load.
        setIsPasswordRecovery(false);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        currentUserIdRef.current = incomingId;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isPasswordRecovery, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
