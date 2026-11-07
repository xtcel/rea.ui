import { flushSync } from 'react-dom';

/** Circle centre for the reveal, in viewport (CSS) pixels. */
export interface RevealOrigin { x: number; y: number }

const REVEAL_DURATION_MS = 520;
const REVEAL_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
/** The browser skips a transition when the page is hidden or a newer one replaces it:
 *  the UI has already switched, there is just nothing to animate. */
const SKIPPED_TRANSITION_ERRORS = ['InvalidStateError', 'AbortError'];

/** Centre of the control that triggered the switch; falls back to the top-right corner,
 *  which is where both theme buttons live, so menu and keyboard switches read the same. */
export function revealOriginOf(element?: Element | null): RevealOrigin {
  if (element && typeof element.getBoundingClientRect === 'function') {
    const box = element.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }
  return { x: typeof window === 'undefined' ? 0 : window.innerWidth, y: 0 };
}

/** Distance from the centre to the farthest viewport corner, i.e. the radius that covers everything. */
export function revealRadius(origin: RevealOrigin, width = typeof window === 'undefined' ? 0 : window.innerWidth, height = typeof window === 'undefined' ? 0 : window.innerHeight): number {
  return Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y));
}

export function shouldSkipReveal(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  return typeof document.startViewTransition !== 'function';
}

/**
 * Runs `apply` (the theme swap) and lets the new interface push the old one away from `origin`
 * with a growing circular clip. Without View Transitions or with reduced motion it just applies.
 * Errors thrown by `apply` are re-thrown, and the interface stays unchanged in that case.
 */
export async function revealThemeTransition(origin: RevealOrigin, apply: () => void): Promise<void> {
  if (shouldSkipReveal()) { apply(); return; }

  const outcome: { failure: { error: unknown } | null } = { failure: null };
  const transition = document.startViewTransition(() => {
    // The swap must be committed synchronously inside the callback, otherwise the browser
    // snapshots the old look twice and nothing appears to change.
    try { flushSync(apply); } catch (error) { outcome.failure = { error }; }
  });
  await transition.updateCallbackDone;
  if (outcome.failure !== null) throw outcome.failure.error;

  try {
    await transition.ready;
  }
  catch (error) {
    if (error instanceof DOMException && SKIPPED_TRANSITION_ERRORS.includes(error.name)) return;
    throw error;
  }

  const radius = revealRadius(origin);
  document.documentElement.animate(
    { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
    { duration: REVEAL_DURATION_MS, easing: REVEAL_EASING, pseudoElement: '::view-transition-new(root)' },
  );
}
