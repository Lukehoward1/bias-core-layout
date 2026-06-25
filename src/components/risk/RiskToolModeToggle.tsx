import { cn } from "@/lib/utils";
import type { RiskToolMode } from "@/hooks/use-risk-tool-mode";

interface RiskToolModeToggleProps {
  mode: RiskToolMode;
  onChange: (m: RiskToolMode) => void;
}

export function RiskToolModeToggle({ mode, onChange }: RiskToolModeToggleProps) {
  return (
    <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5 gap-0.5">
      <button
        type="button"
        onClick={() => onChange("linked")}
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
