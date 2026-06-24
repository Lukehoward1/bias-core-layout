import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Play, Save, ChevronDown, ChevronUp } from "lucide-react";

interface ReportBuilderProps {
  /** When true (default), render the collapsible card wrapper. Set false when inside a Dialog. */
  showHeader?: boolean;
}
import { formatDistanceToNow } from "date-fns";
import { useSavedReports } from "@/hooks/use-saved-reports";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { ACTIVE_ACCOUNT_ALL } from "@/hooks/use-active-trading-account";
import { toast } from "sonner";

const REPORT_TYPES = [
  { id: "overview",   label: "Overview",        description: "Key metrics at a glance" },
  { id: "comparison", label: "Comparison",      description: "Compare across dimensions" },
  { id: "trend",      label: "Trend",           description: "Performance over time" },
  { id: "deep-dive",  label: "Deep Dive",       description: "In-depth on one dimension" },
  { id: "weekly",     label: "Weekly Review",   description: "Structured weekly summary" },
  { id: "monthly",    label: "Monthly Review",  description: "Structured monthly summary" },
] as const;

type ReportTypeId = typeof REPORT_TYPES[number]["id"];

const SUBJECTS_BY_TYPE: Partial<Record<ReportTypeId, string[]>> = {
  comparison: ["Session", "Setup", "Tag", "Pair", "Day of Week"],
  trend:      ["Session", "Setup", "Tag", "Pair"],
  "deep-dive":["Session", "Setup", "Tag", "Pair"],
};

const DATE_PRESETS = [
  { id: "this-week",  label: "This Week" },
  { id: "this-month", label: "This Month" },
  { id: "last-30",    label: "Last 30 Days" },
  { id: "last-90",    label: "Last 90 Days" },
] as const;

export function ReportBuilder({ showHeader = true }: ReportBuilderProps) {
  const { reports, isLoading, saveReport, deleteReport, runReport } = useSavedReports();
  const { accounts } = useLinkedAccounts();

  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedType, setSelectedType] = useState<ReportTypeId | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<string>("last-30");
  const [scopeAccountId, setScopeAccountId] = useState<string>(ACTIVE_ACCOUNT_ALL);

  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const availableSubjects = selectedType ? (SUBJECTS_BY_TYPE[selectedType] ?? []) : [];
  const needsSubject = availableSubjects.length > 0;

  const handleTypeSelect = (typeId: ReportTypeId) => {
    setSelectedType(typeId);
    setSelectedSubject(null);
  };

  const handlePreview = () => {
    if (!selectedType) {
      toast.error("Select a report type first.");
      return;
    }
    toast.info("Report preview coming soon.");
  };

  const handleSaveConfig = async () => {
    const name = saveName.trim();
    if (!name) {
      toast.error("Enter a name for this report config.");
      return;
    }
    if (!selectedType) {
      toast.error("Select a report type first.");
      return;
    }
    const filters: Record<string, unknown> = { datePreset, accountId: scopeAccountId };
    await saveReport(name, selectedType, selectedSubject, filters);
    toast.success("Report config saved.");
    setSaveName("");
    setIsSaving(false);
  };

  const handleRun = async (id: string) => {
    await runReport(id);
    toast.info("Report preview coming soon.");
  };

  const steps = (
    <div className="space-y-5">

            {/* Step 1 — Report Type */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                1 — Report Type
              </p>
              <div className="flex flex-wrap gap-2">
                {REPORT_TYPES.map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => handleTypeSelect(rt.id)}
                    className={`group flex flex-col items-start px-3 py-2 rounded-md border text-left transition-colors ${
                      selectedType === rt.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 border-border hover:border-primary/50 hover:bg-muted/60"
                    }`}
                  >
                    <span className="text-xs font-medium">{rt.label}</span>
                    <span
                      className={`text-[10px] mt-0.5 leading-tight ${
                        selectedType === rt.id ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {rt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Subject (conditional) */}
            {needsSubject && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  2 — Subject
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSubjects.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSubject((prev) => (prev === s ? null : s))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selectedSubject === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 border-border hover:border-primary/50 hover:text-foreground text-muted-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 — Scope */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {needsSubject ? "3" : "2"} — Scope
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDatePreset(p.id)}
                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      datePreset === p.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 border-border hover:border-primary/50 hover:text-foreground text-muted-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                <Select value={scopeAccountId} onValueChange={setScopeAccountId}>
                  <SelectTrigger className="h-7 w-auto min-w-[150px] text-xs gap-1.5">
                    <span className="text-muted-foreground">Account:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ACTIVE_ACCOUNT_ALL}>All Accounts</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Step 4 — Actions */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {needsSubject ? "4" : "3"} — Actions
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" className="h-8" onClick={handlePreview}>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Preview Report
                </Button>

                {!isSaving ? (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setIsSaving(true)}>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save Config
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 text-xs w-44"
                      placeholder="Config name…"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveConfig();
                        if (e.key === "Escape") { setIsSaving(false); setSaveName(""); }
                      }}
                      autoFocus
                    />
                    <Button size="sm" className="h-8" onClick={handleSaveConfig} disabled={!saveName.trim()}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => { setIsSaving(false); setSaveName(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
  );

  const savedConfigs = !isLoading && reports.length > 0 ? (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Saved Configs
        </p>
      </div>
      <ul className="divide-y divide-border">
        {reports.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {REPORT_TYPES.find((t) => t.id === r.type)?.label ?? r.type}
                </Badge>
                {r.subject && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {r.subject}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {r.lastRunAt
                    ? `Run ${formatDistanceToNow(new Date(r.lastRunAt), { addSuffix: true })}`
                    : "Never run"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {confirmDeleteId === r.id ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => { deleteReport(r.id); setConfirmDeleteId(null); }}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleRun(r.id)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Run
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDeleteId(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  if (!showHeader) {
    return (
      <div className="space-y-5">
        {steps}
        {savedConfigs}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card">
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-4 text-left"
          onClick={() => setIsExpanded((v) => !v)}
        >
          <div>
            <p className="text-sm font-semibold">Build &amp; Export Report</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a type, configure scope, then preview or save for later.
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {isExpanded && (
          <div className="px-5 pb-5 border-t border-border pt-4">
            {steps}
          </div>
        )}
      </div>
      {savedConfigs}
    </div>
  );
}
