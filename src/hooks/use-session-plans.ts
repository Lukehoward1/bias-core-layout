import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface SessionPlan {
  id: string;
  date: string;
  marketBias: string;
  keyLevels: string;
  reflection: string;
}

type SupabaseRow = {
  id: string;
  user_id: string;
  date: string;
  market_bias: string | null;
  key_levels: string | null;
  reflection: string | null;
};

function fromRow(row: SupabaseRow): SessionPlan {
  return {
    id: row.id,
    date: row.date,
    marketBias: row.market_bias ?? "",
    keyLevels: row.key_levels ?? "",
    reflection: row.reflection ?? "",
  };
}

function emptyPlan(date: string): SessionPlan {
  return { id: "", date, marketBias: "", keyLevels: "", reflection: "" };
}

export type SaveStatus = "idle" | "saving" | "saved";

export function useSessionPlan(date: string) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<SessionPlan>(() => emptyPlan(date));
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const planRef = useRef<SessionPlan>(plan);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDateRef = useRef<string>(date);
  // Always-current ref to flushSave so the fetch effect can call it without it
  // being a reactive dependency (avoids re-running the fetch on every render).
  const flushSaveRef = useRef<() => Promise<void>>(async () => {});

  // Sync ref whenever plan changes
  useEffect(() => { planRef.current = plan; }, [plan]);

  // Fetch plan for the given date
  useEffect(() => {
    if (!user || !date) return;
    let cancelled = false;

    // If the date changed and a debounced save is pending, flush it immediately
    // using the previous date's snapshot before overwriting planRef.
    if (prevDateRef.current !== date && debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      // planRef.current still holds the previous date's unsaved data here.
      // flushSave reads planRef.current synchronously before its first await,
      // so the old snapshot is captured correctly even though we reset it below.
      flushSaveRef.current();
    }
    prevDateRef.current = date;

    setIsLoading(true);
    const fresh = emptyPlan(date);
    setPlan(fresh);
    planRef.current = fresh;

    supabase
      .from("session_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          const loaded = fromRow(data as SupabaseRow);
          setPlan(loaded);
          planRef.current = loaded;
        }
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id, date]);

  const flushSave = useCallback(async () => {
    if (!user) return;
    setSaveStatus("saving");
    const current = planRef.current;

    const { data, error } = await supabase
      .from("session_plans")
      .upsert(
        {
          user_id: user.id,
          date: current.date,
          market_bias: current.marketBias || null,
          key_levels: current.keyLevels || null,
          reflection: current.reflection || null,
        },
        { onConflict: "user_id,date" },
      )
      .select()
      .single();

    if (!error && data) {
      const saved = fromRow(data as SupabaseRow);
      setPlan(saved);
      planRef.current = saved;
    }

    setSaveStatus("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
  }, [user]);

  // Keep flushSaveRef in sync so the fetch effect always calls the latest version.
  useEffect(() => { flushSaveRef.current = flushSave; }, [flushSave]);

  const updateField = useCallback(
    (field: "marketBias" | "keyLevels" | "reflection", value: string) => {
      setPlan((prev) => {
        const next = { ...prev, [field]: value };
        planRef.current = next;
        return next;
      });

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flushSave, 1500);
    },
    [flushSave],
  );

  return { plan, isLoading, saveStatus, updateField };
}
