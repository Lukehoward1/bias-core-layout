// src/hooks/use-replay.ts
// Thin React wrapper around replayReducer with a requestAnimationFrame clock.
// Does NOT import ChartEngine or any chart types.

import { useReducer, useEffect, useMemo, useCallback } from 'react';
import {
  replayReducer,
  createInitialState,
  projectBars,
  visiblePivots,
  type AggregatorBar,
  type ReplayState,
  type ReplayAction,
  type SwingPivot,
} from '@/services/replayEngine';

export type { AggregatorBar, ReplayState, ReplayAction, SwingPivot };

export interface UseReplayOptions {
  sourceBars1m: AggregatorBar[];
  startMs?: number;
  endMs?: number;
  intervalMinutes?: number;
  pivotN?: number; // default 3
}

export interface UseReplayReturn {
  state: ReplayState;
  displayBars: AggregatorBar[];
  pivots: SwingPivot[];
  play: () => void;
  pause: () => void;
  step: (n: number) => void;
  jumpTo: (ts: number) => void;
  setSpeed: (speed: 1 | 2 | 5 | 10) => void;
  dispatch: React.Dispatch<ReplayAction>;
}

export function useReplay({
  sourceBars1m,
  startMs,
  endMs,
  intervalMinutes = 60,
  pivotN = 3,
}: UseReplayOptions): UseReplayReturn {
  const derivedStart = startMs ?? sourceBars1m[0]?.timestamp ?? 0;
  const derivedEnd = endMs ?? sourceBars1m[sourceBars1m.length - 1]?.timestamp ?? 0;

  const [state, dispatch] = useReducer(
    replayReducer,
    undefined,
    () => createInitialState(derivedStart, derivedEnd),
  );

  // requestAnimationFrame clock — pauses when document.hidden
  useEffect(() => {
    if (!state.playing) return;

    let lastTime: number | null = null;
    let rafId: number;

    const tick = (time: number) => {
      if (!document.hidden && lastTime !== null) {
        dispatch({ type: 'tick', elapsedMs: time - lastTime });
      }
      lastTime = document.hidden ? null : time;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [state.playing]);

  const displayBars = useMemo(
    () => projectBars(sourceBars1m, state.cursorMs, intervalMinutes),
    [sourceBars1m, state.cursorMs, intervalMinutes],
  );

  const pivots = useMemo(
    () => visiblePivots(displayBars, pivotN, state.cursorMs, intervalMinutes),
    [displayBars, pivotN, state.cursorMs, intervalMinutes],
  );

  const play = useCallback(() => dispatch({ type: 'play' }), []);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const step = useCallback((n: number) => dispatch({ type: 'step', n }), []);
  const jumpTo = useCallback((ts: number) => dispatch({ type: 'jumpTo', ts }), []);
  const setSpeed = useCallback(
    (speed: 1 | 2 | 5 | 10) => dispatch({ type: 'setSpeed', speed }),
    [],
  );

  return { state, displayBars, pivots, play, pause, step, jumpTo, setSpeed, dispatch };
}
