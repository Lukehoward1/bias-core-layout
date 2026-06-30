import { useState, useCallback, useEffect, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Upload, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useJournalTrades } from "@/hooks/use-journal-trades";

// ── Types ─────────────────────────────────────────────────────────────────────

type RawRow = Record<string, string>;

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  matchers: string[];
}

const FIELDS: FieldDef[] = [
  { key: "date",      label: "Date",             required: true,  matchers: ["date","time","open time","close time","datetime","entry date","exit date"] },
  { key: "pair",      label: "Pair / Symbol",    required: true,  matchers: ["pair","symbol","instrument","asset","ticker","market","currency pair","ccy pair"] },
  { key: "direction", label: "Direction",        required: true,  matchers: ["type","direction","side","action","buy/sell","long/short","trade type","trade direction","order type","order side"] },
  { key: "pnl",       label: "P&L",              required: true,  matchers: ["pnl","p&l","profit","profit/loss","result","gain","return","net p&l","net pnl"] },
  { key: "entry",     label: "Entry Price",      required: false, matchers: ["entry","open","open price","entry price"] },
  { key: "exit",      label: "Exit Price",       required: false, matchers: ["exit","close","close price","exit price"] },
  { key: "lots",      label: "Lots / Size",      required: false, matchers: ["lots","size","volume","quantity","units","position size","lot size","contract size"] },
  { key: "status",    label: "Status",           required: false, matchers: ["status","outcome","result","win/loss"] },
  { key: "notes",     label: "Notes",            required: false, matchers: ["notes","comment","comments","description","remark"] },
  { key: "setup",     label: "Setup / Strategy", required: false, matchers: ["setup","strategy","pattern","signal"] },
  { key: "rating",    label: "Rating (1–5)",     required: false, matchers: ["rating","score","grade","stars"] },
  { key: "actualR",   label: "R Multiple",       required: false, matchers: ["r","r multiple","rr","r:r","actual r","r-multiple"] },
];

const SKIP = "__skip__";
const LS_KEYS = ["import_step", "import_filename", "import_headers", "import_raw_rows", "import_mapping"] as const;

// ── Header row detection ──────────────────────────────────────────────────────

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const nonNumericNonEmpty = row.filter((cell) => {
      const v = String(cell ?? "").trim();
      if (!v) return false;
      if (/^-?\d+(\.\d+)?$/.test(v)) return false;
      return true;
    });
    const unique = new Set(nonNumericNonEmpty.map((v) => v.toLowerCase()));
    if (nonNumericNonEmpty.length >= 3 && unique.size > 1) return i;
  }
  return 0;
}

function rawRowsFrom2D(hdrs: string[], dataRows: string[][]): RawRow[] {
  return dataRows
    .filter((row) => row.some((cell) => String(cell ?? "").trim()))
    .map((row) => {
      const obj: RawRow = {};
      hdrs.forEach((h, i) => { obj[h] = String(row[i] ?? "").trim(); });
      return obj;
    });
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

function normaliseDirection(raw: string): { value: "Long" | "Short"; warn: boolean } {
  const v = raw.trim().toLowerCase();
  if (["buy","long","b","1"].includes(v)) return { value: "Long", warn: false };
  if (["sell","short","s","-1"].includes(v)) return { value: "Short", warn: false };
  return { value: "Long", warn: true };
}

function normalisePnl(raw: string): { value: number; warn: boolean } {
  const cleaned = raw.replace(/[£$€,\s]/g, "");
  const n = parseFloat(cleaned);
  if (Number.isFinite(n)) return { value: n, warn: false };
  return { value: 0, warn: true };
}

function normaliseDate(raw: string): { value: string; warn: boolean } {
  const d1 = new Date(raw);
  if (!isNaN(d1.getTime())) {
    return { value: d1.toISOString().split("T")[0], warn: false };
  }
  const ddmm = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (ddmm) {
    const [, dd, mm, yyyy] = ddmm;
    const d2 = new Date(`${yyyy.length === 2 ? "20" + yyyy : yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`);
    if (!isNaN(d2.getTime())) return { value: d2.toISOString().split("T")[0], warn: false };
  }
  return { value: raw, warn: true };
}

function normaliseStatus(raw: string): "win" | "loss" | "breakeven" {
  const v = raw.trim().toLowerCase();
  if (["win","won","profit","profitable","positive","w"].includes(v)) return "win";
  if (["loss","lose","lost","negative","l"].includes(v)) return "loss";
  if (["be","breakeven","break even","break-even","0"].includes(v)) return "breakeven";
  return "breakeven";
}

function deriveStatus(pnl: number): "win" | "loss" | "breakeven" {
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";
  return "breakeven";
}

// ── Auto-map ─────────────────────────────────────────────────────────────────

function autoMap(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const field of FIELDS) {
    const idx = lower.findIndex(h => field.matchers.includes(h));
    mapping[field.key] = idx >= 0 ? headers[idx] : SKIP;
  }
  return mapping;
}

// ── Transformed row ───────────────────────────────────────────────────────────

interface TransformedRow {
  date: string;
  dateWarn: boolean;
  pair: string;
  direction: "Long" | "Short";
  directionWarn: boolean;
  pnl: number;
  pnlWarn: boolean;
  entry: number | null;
  exit: number | null;
  lots: number | null;
  status: "win" | "loss" | "breakeven";
  notes: string | null;
  setup: string | null;
  rating: number | null;
  actualR: number | null;
  hasRequiredWarn: boolean;
}

function transformRow(raw: RawRow, mapping: Record<string, string>): TransformedRow {
  const get = (key: string) => {
    const col = mapping[key];
    return col && col !== SKIP ? (raw[col] ?? "").trim() : "";
  };

  const { value: date, warn: dateWarn } = normaliseDate(get("date"));
  const { value: direction, warn: directionWarn } = normaliseDirection(get("direction") || "long");
  const { value: pnl, warn: pnlWarn } = normalisePnl(get("pnl") || "0");

  const entryRaw = get("entry");
  const exitRaw = get("exit");
  const lotsRaw = get("lots");
  const ratingRaw = get("rating");
  const actualRRaw = get("actualR");

  const statusRaw = get("status");
  const status = statusRaw ? normaliseStatus(statusRaw) : deriveStatus(pnl);

  return {
    date,
    dateWarn,
    pair: get("pair") || "—",
    direction,
    directionWarn,
    pnl,
    pnlWarn,
    entry: entryRaw ? parseFloat(entryRaw) || null : null,
    exit: exitRaw ? parseFloat(exitRaw) || null : null,
    lots: lotsRaw ? parseFloat(lotsRaw) || null : null,
    status,
    notes: get("notes") || null,
    setup: get("setup") || null,
    rating: ratingRaw ? parseInt(ratingRaw) || null : null,
    actualR: actualRRaw ? parseFloat(actualRRaw) || null : null,
    hasRequiredWarn: dateWarn || directionWarn || pnlWarn,
  };
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ["Upload", "Map Columns", "Preview & Import"];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
            i + 1 === step ? "bg-primary text-primary-foreground" :
            i + 1 < step ? "bg-primary/30 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {i + 1 < step ? "✓" : i + 1}
          </div>
          <span className={cn("text-xs", i + 1 === step ? "text-foreground font-medium" : "text-muted-foreground")}>
            {label}
          </span>
          {i < steps.length - 1 && <div className="h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  );
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function clearImportStorage() {
  LS_KEYS.forEach((k) => localStorage.removeItem(k));
}

// ── Main component ────────────────────────────────────────────────────────────

export interface ImportTradesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportTradesDialog({ open, onOpenChange }: ImportTradesDialogProps) {
  const { addManualTrade } = useJournalTrades();

  const [step, setStep] = useState<number>(() => lsGet("import_step", 1));
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>(() => lsGet("import_filename", ""));
  const [headers, setHeaders] = useState<string[]>(() => lsGet("import_headers", []));
  const [rawRows, setRawRows] = useState<RawRow[]>(() => lsGet("import_raw_rows", []));
  const [mapping, setMapping] = useState<Record<string, string>>(() => lsGet("import_mapping", {}));
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem("import_step", JSON.stringify(step)); }, [step]);
  useEffect(() => { localStorage.setItem("import_filename", JSON.stringify(fileName)); }, [fileName]);
  useEffect(() => { localStorage.setItem("import_headers", JSON.stringify(headers)); }, [headers]);
  useEffect(() => {
    if (rawRows.length > 0) localStorage.setItem("import_raw_rows", JSON.stringify(rawRows));
    else localStorage.removeItem("import_raw_rows");
  }, [rawRows]);
  useEffect(() => { localStorage.setItem("import_mapping", JSON.stringify(mapping)); }, [mapping]);

  const reset = () => {
    clearImportStorage();
    setStep(1);
    setIsDragging(false);
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setImporting(false);
    setImportedCount(0);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  // ── File parsing ──────────────────────────────────────────────────────────

  const processFile = (file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (result) => {
          const allRows = result.data as string[][];
          const headerIdx = findHeaderRow(allRows);
          const hdrs = allRows[headerIdx].map(String);
          const rows = rawRowsFrom2D(hdrs, allRows.slice(headerIdx + 1));
          setHeaders(hdrs);
          setRawRows(rows);
          setMapping(autoMap(hdrs));
          setStep(2);
        },
        error: () => toast.error("Failed to parse CSV file."),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw2D = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false }) as string[][];
          const headerIdx = findHeaderRow(raw2D);
          const hdrs = raw2D[headerIdx].map(String);
          const rows = rawRowsFrom2D(hdrs, raw2D.slice(headerIdx + 1));
          setHeaders(hdrs);
          setRawRows(rows);
          setMapping(autoMap(hdrs));
          setStep(2);
        } catch {
          toast.error("Failed to parse Excel file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Please upload a .csv or .xlsx file.");
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mapping validation ────────────────────────────────────────────────────

  const requiredFields = FIELDS.filter(f => f.required);
  const canProceedToPreview = requiredFields.every(f => mapping[f.key] && mapping[f.key] !== SKIP);

  // ── Transformed rows ──────────────────────────────────────────────────────

  const transformed = rawRows.map(r => transformRow(r, mapping));
  const validRows = transformed.filter(r => !r.hasRequiredWarn);
  const warnRows = transformed.filter(r => r.hasRequiredWarn);
  const preview = transformed.slice(0, 5);

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    setImporting(true);
    let count = 0;
    for (const row of validRows) {
      await addManualTrade({
        id: crypto.randomUUID(),
        date: row.date,
        pair: row.pair,
        type: row.direction,
        entry: row.entry ?? 0,
        exit: row.exit ?? 0,
        lots: row.lots ?? 0,
        pnl: row.pnl,
        status: row.status,
        notes: row.notes ?? undefined,
        setup: row.setup ?? undefined,
        rating: row.rating ?? undefined,
        actualR: row.actualR ?? undefined,
        source: "manual",
      });
      count++;
      setImportedCount(count);
    }
    setImporting(false);
    toast.success(`Imported ${count} trade${count !== 1 ? "s" : ""} successfully.`);
    handleClose(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Trades</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pt-2">
          <StepIndicator step={step} />

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drop your trading journal here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-2">Supports .csv and .xlsx files</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={onFileInput}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Map Columns ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                <p className="text-xs text-foreground">
                  <span className="font-medium">{fileName}</span>
                  {" — "}Found <span className="font-medium">{rawRows.length}</span> trades
                </p>
              </div>

              <div className="space-y-3">
                {FIELDS.map(field => (
                  <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                    <Label className="text-sm">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select
                      value={mapping[field.key] ?? SKIP}
                      onValueChange={(v) => setMapping(prev => ({ ...prev, [field.key]: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!field.required && (
                          <SelectItem value={SKIP} className="text-xs text-muted-foreground">— skip —</SelectItem>
                        )}
                        {headers.map(h => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {!canProceedToPreview && (
                <p className="text-xs text-muted-foreground">
                  Map all required fields (<span className="text-destructive">*</span>) to continue.
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Preview & Import ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-xs gap-1 text-success border-success/30">
                  <CheckCircle className="h-3 w-3" />
                  {validRows.length} ready to import
                </Badge>
                {warnRows.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 text-warning border-warning/30">
                    <AlertTriangle className="h-3 w-3" />
                    {warnRows.length} row{warnRows.length !== 1 ? "s" : ""} with warnings (excluded)
                  </Badge>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Pair</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Direction</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">P&L</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={cn("border-b border-border last:border-0", row.hasRequiredWarn && "bg-destructive/5")}>
                        <td className="px-3 py-2">
                          {row.dateWarn
                            ? <span className="text-destructive">⚠ Invalid date</span>
                            : row.date}
                        </td>
                        <td className="px-3 py-2">{row.pair}</td>
                        <td className="px-3 py-2">
                          {row.directionWarn
                            ? <span className="text-destructive">⚠ Unknown</span>
                            : <span className={row.direction === "Long" ? "text-success" : "text-destructive"}>{row.direction}</span>}
                        </td>
                        <td className={cn("px-3 py-2 text-right font-medium", row.pnlWarn ? "text-destructive" : row.pnl >= 0 ? "text-success" : "text-destructive")}>
                          {row.pnlWarn ? "⚠ Invalid" : `${row.pnl >= 0 ? "+" : ""}£${row.pnl.toLocaleString()}`}
                        </td>
                        <td className="px-3 py-2 capitalize">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transformed.length > 5 && (
                  <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">
                    Showing 5 of {transformed.length} rows
                  </p>
                )}
              </div>

              {importing && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-xs text-foreground">
                    Importing… {importedCount} / {validRows.length}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-border pt-4 mt-2 shrink-0 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step === 1 ? handleClose(false) : setStep(s => s - 1)}
          >
            {step === 1 ? "Cancel" : <><ChevronLeft className="h-4 w-4 mr-1" />Back</>}
          </Button>

          {step < 3 && (
            <Button
              size="sm"
              disabled={step === 1 ? rawRows.length === 0 : !canProceedToPreview}
              onClick={() => setStep(s => s + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 3 && (
            <Button
              size="sm"
              disabled={validRows.length === 0 || importing}
              onClick={handleImport}
            >
              {importing ? "Importing…" : `Import ${validRows.length} Trade${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
