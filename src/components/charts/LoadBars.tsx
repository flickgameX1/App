import { useState } from 'react';
import type { LoadSlice } from '../../lib/stats';

/**
 * Where the XP came from, by how hard the work was to face.
 *
 * Bar length is the encoding, so every bar wears the same hue: a lightness ramp
 * keyed to the category would restate the ordering the labels already carry, and
 * its palest step drops under the contrast floor on the light theme.
 */
export default function LoadBars({ slices }: { slices: LoadSlice[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...slices.map((s) => s.xp));

  return (
    <ul className="space-y-2.5">
      {slices.map((slice) => {
        const pct = (slice.xp / max) * 100;
        const on = hover === slice.load;
        return (
          <li
            key={slice.load}
            onPointerEnter={() => setHover(slice.load)}
            onPointerLeave={() => setHover(null)}
          >
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted">{slice.load}</span>
              <span className="tabular-nums text-dim">
                {on ? (
                  <>
                    {slice.tasks} {slice.tasks === 1 ? 'task' : 'tasks'} done · ×{slice.multiplier}
                  </>
                ) : (
                  <>{slice.xp} XP</>
                )}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full">
              <div
                className="h-full rounded-r-[4px] bg-reward"
                style={{ width: `${Math.max(slice.xp > 0 ? 2 : 0, pct)}%`, opacity: on || hover === null ? 1 : 0.55 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
