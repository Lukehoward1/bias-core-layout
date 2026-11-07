import type { TfCode } from '@/data/timeframes';
import { TF_BY_CODE } from '@/data/timeframes';
import type { TraderStyle } from '@/context/TraderStyleProvider';

export type TfRole = 'bias' | 'structure' | 'entry';

export interface TraderTimeframes {
  bias: TfCode;      // highest — directional lead
  structure: TfCode; // middle   — structural confirmation
  entry: TfCode;     // lowest   — timing
  // Invariant: bias.minutes > structure.minutes > entry.minutes (strict)
}

export const PRESETS: Record<TraderStyle, TraderTimeframes> = {
  scalper:  { bias: '1h',    structure: '15min', entry: '5min'  },
  intraday: { bias: '4h',    structure: '1h',    entry: '15min' },
  swing:    { bias: '1week', structure: '1day',  entry: '4h'    },
};

// Weights sum to 1.0. Higher TF leads direction; entry TF only times it.
export const ROLE_WEIGHT: Record<TfRole, number> = {
  bias:      0.50,
  structure: 0.30,
  entry:     0.20,
};

export function isStrictlyDescending(tfs: TraderTimeframes): boolean {
  return (
    TF_BY_CODE[tfs.bias].minutes > TF_BY_CODE[tfs.structure].minutes &&
    TF_BY_CODE[tfs.structure].minutes > TF_BY_CODE[tfs.entry].minutes
  );
}

function shallowEqual(a: TraderTimeframes, b: TraderTimeframes): boolean {
  return a.bias === b.bias && a.structure === b.structure && a.entry === b.entry;
}

/**
 * Merges any partial custom slots over the style preset.
 * Falls back to the pure preset if the merged result violates strict-descending order.
 */
export function getTraderTimeframes(
  style: TraderStyle,
  custom: Partial<TraderTimeframes> | null,
): TraderTimeframes {
  const preset = PRESETS[style];
  if (!custom) return preset;
  const merged: TraderTimeframes = { ...preset, ...custom };
  if (!isStrictlyDescending(merged)) return preset;
  return merged;
}

export function isCustom(style: TraderStyle, resolved: TraderTimeframes): boolean {
  return !shallowEqual(resolved, PRESETS[style]);
}
