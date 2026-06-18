import React, { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") {
        // Recovery session: expose the flag but still set the session so
        // ResetPassword can call updateUser() with a valid auth token.
        setIsPasswordRecovery(true);
        setSession(newSession);
        setUser(newSession?.user ?? null);
      } else {
        // All other events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED)
        // behave exactly as before.
        setIsPasswordRecovery(false);
        setSession(newSession);
        setUser(newSession?.user ?? null);
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
