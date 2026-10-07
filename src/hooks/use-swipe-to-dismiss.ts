import { useRef, useCallback } from "react";
import type React from "react";

const DISMISS_THRESHOLD_PX = 80;
// Horizontal movement must exceed vertical by this multiplier before the
// gesture is considered a horizontal swipe. Keeps vertical scrolling clean.
const HORIZONTAL_BIAS = 2;

type SwipeState = {
  pointerId: number;
  startX: number;
  startY: number;
  committed: boolean;
} | null;

export type SwipeHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
};

export function useSwipeToDismiss(onDismiss: () => void): SwipeHandlers {
  const state = useRef<SwipeState>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    state.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      committed: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = state.current;
    if (!s || e.pointerId !== s.pointerId) return;

    const dx = Math.abs(e.clientX - s.startX);
    const dy = Math.abs(e.clientY - s.startY);

    if (!s.committed) {
      if (dy > dx * HORIZONTAL_BIAS) {
        // Clearly vertical — cancel so normal scrolling is unaffected.
        state.current = null;
        return;
      }
      if (dx > dy * HORIZONTAL_BIAS) {
        state.current = { ...s, committed: true };
      }
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const s = state.current;
      state.current = null;
      if (!s || e.pointerId !== s.pointerId || !s.committed) return;
      if (Math.abs(e.clientX - s.startX) >= DISMISS_THRESHOLD_PX) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  const onPointerCancel = useCallback(() => {
    state.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
