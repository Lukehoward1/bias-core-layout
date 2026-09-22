import { cn } from "@/lib/utils";
import type { RiskToolMode } from "@/hooks/use-risk-tool-mode";
import { useTapHandler } from "@/hooks/use-tap-handler";

interface RiskToolModeToggleProps {
  mode: RiskToolMode;
  onChange: (m: RiskToolMode) => void;
}

export function RiskToolModeToggle({ mode, onChange }: RiskToolModeToggleProps) {
  const tap = useTapHandler();
  return (
    <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5 gap-0.5">
      <button
        type="button"
        onClick={() => onChange("linked")}
        {...tap(() => onChange("linked"))}
        className={cn(
          "px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors leading-none",
          mode === "linked"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Linked
      </button>
      <button
        type="button"
        onClick={() => onChange("manual")}
        {...tap(() => onChange("manual"))}
        className={cn(
          "px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors leading-none",
          mode === "manual"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Manual
      </button>
    </div>
  );
}
