import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface SavedReport {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  filters: Record<string, unknown>;
  createdAt: string;
  lastRunAt: string | null;
}

type SavedReportRow = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  subject: string | null;
  filters: Record<string, unknown>;
  created_at: string;
  last_run_at: string | null;
};

function fromRow(row: SavedReportRow): SavedReport {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    subject: row.subject,
    filters: row.filters ?? {},
    createdAt: row.created_at,
    lastRunAt: row.last_run_at,
  };
}

export function useSavedReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    supabase
      .from("saved_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setReports((data as SavedReportRow[]).map(fromRow));
        }
        setIsLoading(false);
      });
  }, [user?.id]);

  const saveReport = useCallback(
    async (
      name: string,
      type: string,
      subject: string | null,
      filters: Record<string, unknown>,
    ) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("saved_reports")
        .insert({ user_id: user.id, name, type, subject, filters })
        .select()
        .single();
      if (!error && data) {
        const inserted = fromRow(data as SavedReportRow);
        setReports((prev) => [inserted, ...prev]);
        return inserted;
      }
      return null;
    },
    [user],
  );

  const deleteReport = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("saved_reports")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (!error) {
        setReports((prev) => prev.filter((r) => r.id !== id));
      }
    },
    [user],
  );

  const runReport = useCallback(
    async (id: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("saved_reports")
        .update({ last_run_at: now })
        .eq("id", id)
        .eq("user_id", user.id);
      if (!error) {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, lastRunAt: now } : r)),
        );
      }
    },
    [user],
  );

  return { reports, isLoading, saveReport, deleteReport, runReport };
}
