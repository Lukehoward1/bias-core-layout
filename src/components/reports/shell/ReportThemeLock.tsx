// src/components/reports/shell/ReportThemeLock.tsx
//
// Reports are formal documents (tearsheet-style) — they should look identical
// whether the app is in light or dark mode, and identical again when captured
// to PDF. Every themed component in the app (Card, Badge, charts, account
// colors) reads its color through `hsl(var(--token))`, so we can pin those
// CSS custom properties to fixed "document" values on a wrapper div and every
// descendant renders consistently, with zero forking of existing components.
//
// Values below are copied from the `:root` (light) block in src/index.css —
// this is deliberately the light palette, since reports are meant to read
// like a printed statement regardless of the surrounding app chrome.

import type { ReactNode } from "react";

const REPORT_DOCUMENT_TOKENS: Record<string, string> = {
  "--background": "0 0% 100%",
  "--foreground": "222 47% 11%",

  "--card": "0 0% 100%",
  "--card-foreground": "222 47% 11%",

  "--popover": "0 0% 100%",
  "--popover-foreground": "222 47% 11%",

  "--primary": "195 100% 40%",
  "--primary-foreground": "0 0% 100%",

  "--secondary": "200 100% 25%",
  "--secondary-foreground": "0 0% 100%",

  "--muted": "210 40% 96%",
  "--muted-foreground": "215 16% 47%",

  "--accent": "195 100% 50%",
  "--accent-foreground": "0 0% 100%",

  "--destructive": "0 84% 60%",
  "--destructive-foreground": "0 0% 100%",

  "--success": "142 71% 45%",
  "--success-foreground": "0 0% 100%",

  "--warning": "38 92% 50%",
  "--warning-foreground": "0 0% 100%",

  "--border": "214 32% 91%",
  "--input": "214 32% 91%",
  "--ring": "195 100% 40%",

  "--account-color-1": "262 60% 45%",
  "--account-color-2": "346 75% 50%",
  "--account-color-3": "84 55% 40%",
  "--account-color-4": "231 70% 55%",
  "--account-color-5": "300 55% 48%",
  "--account-color-6": "17 75% 50%",
};

interface ReportThemeLockProps {
  children: ReactNode;
  className?: string;
  /** DOM id — the existing PDF export path looks up sections by id. */
  id?: string;
}

/**
 * Wrap report content in this to force the "document" palette regardless of
 * the app's active light/dark theme. Do not nest — a single lock per report.
 *
 * Important: `color` is an inherited CSS property, and inheritance passes
 * down the *computed* value, not a live var() lookup. So overriding
 * `--foreground` here alone isn't enough — any element inside that doesn't
 * set its own `text-*` class (recharts tooltips, third-party widgets) would
 * still inherit whatever color resolved further up the tree (e.g. white
 * text from a dark-mode ancestor), which is invisible on this light
 * document background. Explicitly applying `text-foreground` right here
 * re-resolves `color` against the locked tokens, so everything below that
 * doesn't set its own color falls back to the correct one.
 */
export function ReportThemeLock({ children, className, id }: ReportThemeLockProps) {
  return (
    <div
      id={id}
      className={`text-foreground ${className ?? ""}`}
      style={REPORT_DOCUMENT_TOKENS as React.CSSProperties}
    >
      {children}
    </div>
  );
}
