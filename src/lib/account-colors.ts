// src/lib/account-colors.ts
// Fixed categorical palette for multi-account chart series.
// Values are CSS variable names declared in index.css — light and dark
// variants are handled there, so consumers never hard-code HSL values.

/** CSS variable names for the 6-color account palette. */
export const ACCOUNT_COLORS = [
  "--account-color-1", // violet
  "--account-color-2", // rose
  "--account-color-3", // lime
  "--account-color-4", // indigo
  "--account-color-5", // magenta
  "--account-color-6", // coral
] as const;

/**
 * Returns an `hsl(var(...))` string for the given account index.
 * Cycles through the palette, so index 6 wraps back to color 1.
 * Safe to pass directly to a `color` or `stroke` style prop.
 */
export function getAccountColor(index: number): string {
  return `hsl(var(${ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]}))`;
}
