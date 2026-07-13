import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export function useHomeCurrency() {
  const { user } = useAuth();
  const [homeCurrency, setHomeCurrency] = useState<string>("GBP");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("home_currency")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.home_currency) setHomeCurrency(data.home_currency);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  return { homeCurrency, isLoading };
}
