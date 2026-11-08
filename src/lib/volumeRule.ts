// src/lib/volumeRule.ts
// Pure, provider-aware volume-display rule (plan §2.5).
//
// Decision order:
//   1. If instrument.hasVolume is explicitly set, respect it.
//   2. Count bars with volume > 0 across the loaded set.
//   3. If ≥ 10% have non-zero volume → render "Tick volume" display with a
//      label making clear it's an activity proxy, not true traded volume.
//   4. Else fall back to bar-range activity:
//        last bar's (high - low) vs rolling 20-bar average (high - low)
//        < 0.7×  → Quiet
//        0.7–1.3 → Normal
//        > 1.3×  → Active
//
// No React, no side-effects. Checklist and panel both call this.

export interface VolumeBar {
  high: number;
  low: number;
  volume?: number;
}

export type VolumeRow =
  | { kind: "tick"; lastVolume: number; label: string }
  | { kind: "activity"; level: "Quiet" | "Normal" | "Active"; ratio: number }
  | { kind: "unavailable" };

export interface VolumeRuleOptions {
  /** Instrument-level override: force-show tick volume (true) or force-hide (false). */
  hasVolumeOverride?: boolean;
  /** Minimum share of bars with non-zero volume to treat the feed as tick-volume-capable. */
  tickVolumeThreshold?: number; // default 0.10
  /** Rolling-average window for the activity fallback. */
  activityWindow?: number; // default 20
}

const DEFAULT_TICK_THRESHOLD = 0.1;
const DEFAULT_WINDOW = 20;

export function computeVolumeRow(
  bars: readonly VolumeBar[] | null | undefined,
  opts: VolumeRuleOptions = {},
): VolumeRow {
  if (!bars || bars.length === 0) return { kind: "unavailable" };

  const threshold = opts.tickVolumeThreshold ?? DEFAULT_TICK_THRESHOLD;
  const window = opts.activityWindow ?? DEFAULT_WINDOW;

  const nonZero = bars.filter((b) => (b.volume ?? 0) > 0).length;
  const share = nonZero / bars.length;

  const useTick = opts.hasVolumeOverride === true
    ? true
    : opts.hasVolumeOverride === false
      ? false
      : share >= threshold;

  if (useTick) {
    const last = bars[bars.length - 1];
    return {
      kind: "tick",
      lastVolume: last.volume ?? 0,
      label: "Tick volume (activity proxy, not true traded volume)",
    };
  }

  // Activity fallback: need at least 2 bars to compute a range for "last" + any prior history.
  if (bars.length < 2) return { kind: "unavailable" };

  const last = bars[bars.length - 1];
  const lastRange = Math.max(0, last.high - last.low);

  // Rolling window excludes the current bar.
  const priorStart = Math.max(0, bars.length - 1 - window);
  const prior = bars.slice(priorStart, bars.length - 1);
  if (prior.length === 0) return { kind: "unavailable" };
  const avgRange = prior.reduce((s, b) => s + Math.max(0, b.high - b.low), 0) / prior.length;
  if (!Number.isFinite(avgRange) || avgRange <= 0) return { kind: "unavailable" };

  const ratio = lastRange / avgRange;
  const level = ratio < 0.7 ? "Quiet" : ratio > 1.3 ? "Active" : "Normal";
  return { kind: "activity", level, ratio };
}
