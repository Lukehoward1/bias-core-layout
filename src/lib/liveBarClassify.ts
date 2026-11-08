// src/lib/liveBarClassify.ts
// Pure helper — no browser dependencies, no alias imports beyond types.
// Decides which bar a live tick belongs to relative to the last known base bar.
//
// Live-candle and ChartEngine both use this classifier so a candle rollover
// (new timestamp from the slow channel, or a quote arriving after rollover)
// is handled consistently on both sides.

export type LiveBarUpdateKind = 'same' | 'newer' | 'older';

/**
 * Classify an incoming live-bar timestamp relative to the last base bar.
 *   'same'  → overwrite the last bar's OHLC in place
 *   'newer' → append a new bar (candle rollover)
 *   'older' → ignore (late network response for a bar that has already closed)
 */
export function classifyLiveBarUpdate(
  lastBarTimestamp: number,
  incomingTimestamp: number,
): LiveBarUpdateKind {
  if (incomingTimestamp > lastBarTimestamp) return 'newer';
  if (incomingTimestamp === lastBarTimestamp) return 'same';
  return 'older';
}
