import { useEffect, useState } from 'react';

/**
 * Counts a number up on mount. This is the XP payoff, and one of only two pieces
 * of motion in the app — it fires after the sprint, never during one.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(() => (target === 0 ? 0 : 0));

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      // Ease out, so it lands rather than stopping dead.
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
