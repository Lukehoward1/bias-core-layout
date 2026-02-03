/**
 * Comprehensive DOM cleanup to restore full interaction after lock screen dismissal.
 * Removes inert, aria-hidden, and pointer-events blockers from html/body/root and anywhere else.
 */
export function resetInteractionState() {
  // Target the main containers
  const targets = [
    document.documentElement,
    document.body,
    document.getElementById('root'),
  ].filter(Boolean) as HTMLElement[];

  // Remove inert and aria-hidden from main containers
  targets.forEach((el) => {
    el.removeAttribute('inert');
    el.removeAttribute('aria-hidden');
    el.removeAttribute('data-aria-hidden');
    // Clear pointer-events style
    if (el.style.pointerEvents) {
      el.style.pointerEvents = '';
    }
  });

  // Remove pointer-events: none from any element that has it inline
  document.querySelectorAll('[style*="pointer-events"]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style.pointerEvents === 'none') {
      htmlEl.style.pointerEvents = '';
    }
  });

  // Remove leftover inert attributes anywhere in the document
  document.querySelectorAll('[inert]').forEach((el) => {
    el.removeAttribute('inert');
  });

  // Remove aria-hidden and data-aria-hidden anywhere (often left by Radix)
  document.querySelectorAll('[aria-hidden="true"], [data-aria-hidden]').forEach((el) => {
    el.removeAttribute('aria-hidden');
    el.removeAttribute('data-aria-hidden');
  });
}
