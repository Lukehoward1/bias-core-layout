// src/lib/pollPolicy.ts
// Provider-aware polling intervals and idle detection.

export interface PollIntervals {
  quoteMs: number;
  candleMs: number;
  contextMs: number;
}

export function pollIntervals(providerName: string): PollIntervals {
  if (providerName === 'fmp') {
    return { quoteMs: 15_000, candleMs: 60_000, contextMs: 60_000 };
  }
  // twelvedata (default) — conservative to stay within 8 req/min free tier
  return { quoteMs: 60_000, candleMs: 180_000, contextMs: 180_000 };
}

export function isUserIdle(
  nowMs: number,
  lastActivityMs: number,
  idleAfterMs = 15 * 60_000,
): boolean {
  return nowMs - lastActivityMs > idleAfterMs;
}

// Module-level activity tracker — dispatches 'user-active' on window when
// the user returns after an idle period (tab-hidden or no input >15 min).
let _lastActivity = Date.now();

export function getLastActivity(): number {
  return _lastActivity;
}

function _recordActivity(): void {
  const now = Date.now();
  const prev = _lastActivity;
  _lastActivity = now;
  if (now - prev > 15 * 60_000) {
    window.dispatchEvent(new CustomEvent('user-active'));
  }
}

if (typeof window !== 'undefined') {
  const opts = { passive: true } as AddEventListenerOptions;
  window.addEventListener('mousemove', _recordActivity, opts);
  window.addEventListener('keydown', _recordActivity, opts);
  window.addEventListener('touchstart', _recordActivity, opts);
  window.addEventListener('scroll', _recordActivity, opts);
  window.addEventListener('click', _recordActivity, opts);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) _recordActivity();
  });
}
