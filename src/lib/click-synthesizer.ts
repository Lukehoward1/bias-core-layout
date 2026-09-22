// Global tap → click synthesizer.
//
// On some iOS Safari devices/versions, the browser reliably fires pointerdown
// and pointerup on touch input but never synthesizes the mousedown/mouseup/
// click sequence that every React onClick handler in the app depends on.
// Confirmed by live device trace across two hardware units and both dev and
// prod builds — even a plain <button> injected onto document.body doesn't
// receive click.
//
// This module attaches a single set of document-level pointer listeners that
// build a "tap" gesture from pointerdown/pointermove/pointerup and dispatch
// a real MouseEvent('click') on the pointerdown target when the gesture
// completes without moving beyond ~10 px. The event bubbles, React's root
// click listener picks it up, and every onClick handler in the app fires
// exactly as it would from a real trusted click. No per-component changes
// required.
//
// Caveats a synthetic (isTrusted=false) click event does NOT trigger:
//   - Native <input type="checkbox"|"radio"> default toggle (no `change`
//     event fires either — sites relying on native browser toggle must
//     handle click explicitly).
//   - Native <a href="..."> navigation (must use react-router <Link>).
//   - Native form submission from <button type="submit">.
//   - `mailto:` / `tel:` default actions.
// Radix primitives (Switch, Checkbox, Tabs, Dialog, DropdownMenu, Select,
// Popover, etc.) all use JS-based click handlers internally so they work
// with synthetic clicks.

const MOVEMENT_THRESHOLD_PX = 10;
const THRESHOLD_SQ = MOVEMENT_THRESHOLD_PX * MOVEMENT_THRESHOLD_PX;
// Time window after a synthesized click during which a real trusted click
// is treated as a duplicate and suppressed. On any device where native
// click *does* fire from touch, we'd otherwise double-fire every handler.
const NATIVE_CLICK_SUPPRESS_WINDOW_MS = 400;

type TapState = {
  id: number;
  startX: number;
  startY: number;
  target: EventTarget | null;
} | null;

let state: TapState = null;
let lastSyntheticAt = 0;
let installed = false;

// Selector for elements whose "focused on tap" behaviour is a browser default
// action gated by a trusted event — we have to reproduce it manually because
// dispatchEvent'd mouse events don't perform default actions. `tabindex="-1"`
// is deliberately excluded: those are focusable-via-script-only, not by tap.
const FOCUSABLE_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), ' +
  'textarea:not([disabled]), ' +
  'select:not([disabled]), ' +
  '[contenteditable="true"], ' +
  '[contenteditable=""], ' +
  '[tabindex]:not([tabindex="-1"])';

function focusTappedElement(target: Element): void {
  // <label for="x"> — focus the associated control (native default action).
  const label = target.closest<HTMLLabelElement>("label[for]");
  if (label && label.htmlFor) {
    const associated = document.getElementById(label.htmlFor);
    if (associated && typeof (associated as HTMLElement).focus === "function") {
      try { (associated as HTMLElement).focus(); } catch { /* noop */ }
      return;
    }
  }

  const focusable = target.closest<HTMLElement>(FOCUSABLE_SELECTOR);
  if (!focusable) return;
  if ((focusable as HTMLInputElement).disabled) return;
  try { focusable.focus(); } catch { /* noop */ }
}

export function installClickSynthesizer(): void {
  if (installed) return;
  if (typeof document === "undefined") return;
  installed = true;

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    state = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      target: e.target,
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!state || e.pointerId !== state.id) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (dx * dx + dy * dy > THRESHOLD_SQ) {
      // Treat as scroll/drag — cancel the tap so pointerup doesn't fire.
      state = null;
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const s = state;
    state = null;
    if (!s || e.pointerId !== s.id) return;
    const target = s.target;
    if (!target || !(target instanceof Element)) return;

    lastSyntheticAt = performance.now();

    // Move focus to the tapped focusable, if any. Focusing is normally a
    // *default action* of a trusted mousedown, which browsers skip on
    // synthetic (isTrusted=false) events — so without this, tapping into
    // an <input>/<textarea>/<select>/[contenteditable] does nothing: no
    // cursor, no keyboard, no typing. Also handles <label for="…"> by
    // focusing the associated control, matching native label behaviour.
    focusTappedElement(target);

    // Dispatch the full mousedown → mouseup → click sequence, not just click.
    // Some Radix primitives activate on `mousedown` rather than `click` — most
    // notably @radix-ui/react-tabs, which calls onValueChange from its
    // onMouseDown handler (see node_modules/@radix-ui/react-tabs, ~line 121).
    // A click-only synthesis works for everything else but leaves Tabs dead.
    // roving-focus and react-label also read mousedown, but for focus /
    // selection concerns — dispatching it is a safe no-op there.
    const makeMouseEvent = (type: "mousedown" | "mouseup" | "click") =>
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: e.clientX,
        clientY: e.clientY,
        button: 0,
        buttons: type === "mousedown" ? 1 : 0,
        view: window,
      });

    target.dispatchEvent(makeMouseEvent("mousedown"));
    target.dispatchEvent(makeMouseEvent("mouseup"));
    const click = makeMouseEvent("click");
    target.dispatchEvent(click);

    // A synthetic click on <button type="submit"> doesn't trigger the
    // browser's default form-submission path (no `submit` event on the
    // parent form). Dispatch one manually so <form onSubmit> handlers fire.
    // Skipped if any click handler preventDefault'd the click.
    if (!click.defaultPrevented && target instanceof HTMLElement) {
      const submitBtn = target.closest(
        'button[type="submit"], input[type="submit"]',
      ) as HTMLButtonElement | HTMLInputElement | null;
      const form = submitBtn?.form ?? null;
      if (form) {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    }
  };

  const onPointerCancel = () => {
    state = null;
  };

  const suppressTrustedMouseEvent = (e: MouseEvent) => {
    // Guard for the case where a device *does* eventually emit real trusted
    // mousedown/mouseup/click events after we've already synthesized ours
    // — suppress the duplicates so handlers only fire once. isTrusted is
    // false for our dispatchEvent calls above and true for browser-generated
    // events, so we can distinguish cleanly.
    if (
      e.isTrusted &&
      performance.now() - lastSyntheticAt < NATIVE_CLICK_SUPPRESS_WINDOW_MS
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };

  document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
  document.addEventListener("pointerup", onPointerUp, { capture: true, passive: true });
  document.addEventListener("pointercancel", onPointerCancel, { capture: true, passive: true });
  document.addEventListener("mousedown", suppressTrustedMouseEvent, { capture: true });
  document.addEventListener("mouseup", suppressTrustedMouseEvent, { capture: true });
  document.addEventListener("click", suppressTrustedMouseEvent, { capture: true });
}
