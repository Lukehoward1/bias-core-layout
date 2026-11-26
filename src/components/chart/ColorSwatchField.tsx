// src/components/chart/ColorSwatchField.tsx
// Reusable colour-swatch + label field for chart settings.
// When nullable=true, value may be null (= "auto"); clicking the swatch while
// auto switches to a custom colour.  An "Auto" button resets back to null.
import { cn } from '@/lib/utils';

interface ColorSwatchFieldProps {
  label: string;
  /** Current value. null = "auto" (only valid when nullable=true). */
  value: string | null;
  /** Seed value for the colour picker when switching from auto → custom. */
  defaultValue?: string;
  onChange: (v: string | null) => void;
  /** If true, show an "Auto" reset button when a custom colour is active. */
  nullable?: boolean;
  className?: string;
}

export function ColorSwatchField({
  label,
  value,
  defaultValue = '#888888',
  onChange,
  nullable = false,
  className,
}: ColorSwatchFieldProps) {
  const isAuto = nullable && value === null;
  const pickerValue = value ?? defaultValue;

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {!isAuto && nullable && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors leading-none"
          >
            Auto
          </button>
        )}
        <label
          title={isAuto ? 'Click to set a custom colour' : pickerValue}
          className="relative inline-block w-6 h-6 rounded border border-border/60 cursor-pointer hover:border-border overflow-hidden shrink-0"
        >
          <span
            className="absolute inset-0 rounded"
            style={
              isAuto
                ? {
                    background:
                      'linear-gradient(135deg, #666 25%, #999 25%, #999 50%, #666 50%, #666 75%, #999 75%)',
                    backgroundSize: '8px 8px',
                  }
                : { background: pickerValue }
            }
          />
          <input
            type="color"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
