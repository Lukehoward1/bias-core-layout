import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTraderStyle } from "@/context/TraderStyleProvider";
import { TF_BY_CODE } from "@/data/timeframes";
import type { TfCode } from "@/data/timeframes";
import { wouldBreakOrder, getPickerCodes, isStrictlyDescending } from "@/services/traderTimeframes";
import type { TfRole, TraderTimeframes } from "@/services/traderTimeframes";
import type { TradeInstrument } from "@/data/tradeInstruments";

export interface TraderTimeframesPickerProps {
  instrument?: TradeInstrument | null;
}

const ROLES: readonly { role: TfRole; label: string }[] = [
  { role: "bias",      label: "Bias"      },
  { role: "structure", label: "Structure" },
  { role: "entry",     label: "Entry"     },
];

export function TraderTimeframesPicker({ instrument }: TraderTimeframesPickerProps) {
  const { traderStyle, resolvedTimeframes, isCustomTimeframes, setCustomTimeframes, resetToPreset } = useTraderStyle();
  const [error, setError] = useState<string | null>(null);

  const availableCodes = getPickerCodes(instrument == null || instrument.supports1m);

  const handleChange = (role: TfRole, code: TfCode) => {
    const test: TraderTimeframes = { ...resolvedTimeframes, [role]: code };
    if (!isStrictlyDescending(test)) {
      setError(
        `Invalid order: Bias (${TF_BY_CODE[test.bias].label}) must be strictly greater than Structure (${TF_BY_CODE[test.structure].label}), which must be strictly greater than Entry (${TF_BY_CODE[test.entry].label}).`,
      );
      return;
    }
    setError(null);
    setCustomTimeframes(test);
  };

  const presetLabel =
    traderStyle === "scalper" ? "Scalper" :
    traderStyle === "intraday" ? "Intraday" : "Swing";
  const styleChipLabel = isCustomTimeframes ? "Custom" : presetLabel;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Timeframes</span>
        <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {styleChipLabel}
        </span>
      </div>

      {ROLES.map(({ role, label }) => (
        <div key={role} className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
          <Select
            value={resolvedTimeframes[role]}
            onValueChange={(v) => handleChange(role, v as TfCode)}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCodes.map((code) => {
                const disabled = wouldBreakOrder(role, code, resolvedTimeframes);
                return (
                  <SelectItem
                    key={code}
                    value={code}
                    disabled={disabled}
                    title={disabled ? "Would violate Bias > Structure > Entry order" : undefined}
                  >
                    {TF_BY_CODE[code].label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      ))}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5 leading-snug">
          {error}
        </p>
      )}

      {isCustomTimeframes && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { setError(null); resetToPreset(); }}
        >
          Reset to preset
        </Button>
      )}
    </div>
  );
}
