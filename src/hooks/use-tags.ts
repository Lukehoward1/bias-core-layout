import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

type TagRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

function fromRow(row: TagRow): Tag {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at };
}

export function useTags() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTags([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) {
          setTags((data as TagRow[]).map(fromRow));
        }
        setIsLoading(false);
      });
  }, [user?.id]);

  const addTag = useCallback(
    async (name: string, color = "#6366f1") => {
      if (!user) return;
      const { data, error } = await supabase
        .from("tags")
        .insert({ user_id: user.id, name, color })
        .select()
        .single();
      if (!error && data) {
        setTags((prev) =>
          [...prev, fromRow(data as TagRow)].sort((a, b) => a.name.localeCompare(b.name)),
        );
      } else if (error) {
        console.error("[useTags] addTag failed:", error.message);
        toast.error("Couldn't create that tag — please try again.");
      }
    },
    [user],
  );

  const deleteTag = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (!error) {
        setTags((prev) => prev.filter((t) => t.id !== id));
      } else {
        console.error("[useTags] deleteTag failed:", error.message);
        toast.error("Couldn't delete that tag — please try again.");
      }
    },
    [user],
  );

  const renameTag = useCallback(
    async (id: string, name: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("tags")
        .update({ name })
        .eq("id", id)
        .eq("user_id", user.id);
      if (!error) {
        setTags((prev) =>
          prev
            .map((t) => (t.id === id ? { ...t, name } : t))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } else {
        console.error("[useTags] renameTag failed:", error.message);
        toast.error("Couldn't rename that tag — please try again.");
      }
    },
    [user],
  );

  return { tags, isLoading, addTag, deleteTag, renameTag };
}
