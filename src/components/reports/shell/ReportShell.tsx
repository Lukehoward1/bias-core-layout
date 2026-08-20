// src/components/reports/shell/ReportShell.tsx
//
// Outer document frame — rounded card, subtle border/shadow so the report
// reads as a distinct printable document rather than more dashboard chrome.

import type { ReactNode } from "react";

interface ReportShellProps {
  children: ReactNode;
  className?: string;
}

export function ReportShell({ children, className = "" }: ReportShellProps) {
  return (
    // print:rounded-none matters more than it looks: Chrome's print engine
    // mishandles border-radius on a box that fragments across a page break —
    // it paints the box's full background/border as a solid rectangle on the
    // continuation page even when there's no real child content left there.
    // That's what was producing a near-blank, light-grey page 2. Flattening
    // the corners for print removes the trigger for that rendering bug.
    <div className={`rounded-2xl print:rounded-none border border-border shadow-sm print:shadow-none overflow-hidden print:overflow-visible bg-background ${className}`}>
      {children}
    </div>
  );
}
