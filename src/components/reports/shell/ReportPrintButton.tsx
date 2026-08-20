// src/components/reports/shell/ReportPrintButton.tsx
//
// The masthead's "Print" action — pulled out of each preset (was duplicated
// identically 8 times) so the light-masthead styling only lives in one place.

interface ReportPrintButtonProps {
  onClick: () => void;
}

export function ReportPrintButton({ onClick }: ReportPrintButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium px-3 py-1.5 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
    >
      Print
    </button>
  );
}
