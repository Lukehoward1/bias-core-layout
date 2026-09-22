import type React from "react";
import { useCallback } from "react";

export type TapHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
};

// This hook used to synthesise tap gestures at each individual call site.
// It has been superseded by `installClickSynthesizer()` in
// src/lib/click-synthesizer.ts — a single document-level listener that
// dispatches a real `click` event on tap release, so every existing onClick
// handler in the app fires naturally.
//
// The hook is retained as a no-op so the existing `{...tap(...)}` spreads
// scattered across components (Button, Markets cards, Journal tabs, etc.)
// remain valid JSX and don't need to be reverted. If both this hook and
// the synthesizer were active, the same handler would fire twice per tap
// — hence returning empty handlers here.
//
// Safe to delete both the hook and every call site in a follow-up cleanup;
// no behaviour depends on it any more.
const NOOP = () => {};

export function useTapHandler() {
  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_onTap: (e: React.PointerEvent) => void): TapHandlers => ({
      onPointerDown: NOOP,
      onPointerMove: NOOP,
      onPointerUp: NOOP,
      onPointerCancel: NOOP,
    }),
    [],
  );
}
