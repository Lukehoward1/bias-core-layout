import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface Strategy {
  id: string;
  name: string;
  createdAt: string;
}

type StrategyRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

function fromRow(row: StrategyRow): Strategy {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

const DEFAULT_STRATEGIES = [
  "London Breakout",
  "New York Breakout",
  "Asia Breakout",
  "London/NY Overlap",
  "Fair Value Gap (FVG)",
  "Order Block",
  "Breaker Block",
  "Liquidity Sweep",
  "Break of Structure (BOS)",
  "Change of Character (CHoCH)",
  "4H Pullback",
  "Support & Resistance",
  "Trend Continuation",
  "Reversal",
  "News Trade",
  "Range Breakout",
];

const SEEDED_FLAG_PREFIX = "strategiesSeeded:v1:";

export function useStrategies() {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStrategies([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from("strategies")
      .select("*")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) {
          setStrategies((data as StrategyRow[]).map(fromRow));
        }
        setIsLoading(false);
      });
  }, [user?.id]);

  // One-time seed: insert 16 default strategies when user has none
  useEffect(() => {
    if (isLoading || !user || strategies.length > 0) return;
    const seededKey = `${SEEDED_FLAG_PREFIX}${user.id}`;
    if (localStorage.getItem(seededKey)) return;

    supabase
      .from("strategies")
      .insert(DEFAULT_STRATEGIES.map((name) => ({ user_id: user.id, name })))
      .select()
      .then(({ data, error }) => {
        if (!error && data) {
          setStrategies(
            (data as StrategyRow[]).map(fromRow).sort((a, b) => a.name.localeCompare(b.name)),
          );
          localStorage.setItem(seededKey, "1");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user?.id, strategies.length]);

  const addStrategy = useCallback(
    async (name: string) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("strategies")
        .insert({ user_id: user.id, name })
        .select()
        .single();
      if (!error && data) {
        setStrategies((prev) =>
          [...prev, fromRow(data as StrategyRow)].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
      }
    },
    [user],
  );

  const deleteStrategy = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("strategies")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (!error) {
        setStrategies((prev) => prev.filter((s) => s.id !== id));
      }
    },
    [user],
  );

  const renameStrategy = useCallback(
    async (id: string, name: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("strategies")
        .update({ name })
        .eq("id", id)
        .eq("user_id", user.id);
      if (!error) {
        setStrategies((prev) =>
          prev
            .map((s) => (s.id === id ? { ...s, name } : s))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
    },
    [user],
  );

  return { strategies, isLoading, addStrategy, deleteStrategy, renameStrategy };
}
