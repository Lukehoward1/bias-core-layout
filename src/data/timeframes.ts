export type TfCode = '1min' | '5min' | '15min' | '1h' | '4h' | '1day' | '1week';

export interface TimeframeInfo {
  code: TfCode;
  label: string;
  minutes: number;
}

export const TIMEFRAMES: readonly TimeframeInfo[] = [
  { code: '1min',  label: '1m',     minutes: 1 },
  { code: '5min',  label: '5m',     minutes: 5 },
  { code: '15min', label: '15m',    minutes: 15 },
  { code: '1h',    label: '1H',     minutes: 60 },
  { code: '4h',    label: '4H',     minutes: 240 },
  { code: '1day',  label: 'Daily',  minutes: 1440 },
  { code: '1week', label: 'Weekly', minutes: 10080 },
] as const;

export const TF_BY_CODE = Object.fromEntries(
  TIMEFRAMES.map((tf) => [tf.code, tf]),
) as Record<TfCode, TimeframeInfo>;

/** Sorts timeframes from highest to lowest period (bias → entry order). */
export function compareTfDesc(a: TfCode, b: TfCode): number {
  return TF_BY_CODE[b].minutes - TF_BY_CODE[a].minutes;
}
