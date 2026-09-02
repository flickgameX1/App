import { BADGES } from '../lib/badges';

/**
 * Earned badges read in full colour; the rest stay visible but quiet, so they
 * read as things to reach rather than things you are missing. Nothing here is
 * ever removed once earned.
 */
export default function BadgeList({ earned }: { earned: string[] }) {
  const have = new Set(earned);

  return (
    <ul className="grid grid-cols-2 gap-2">
      {BADGES.map((badge) => {
        const on = have.has(badge.id);
        return (
          <li
            key={badge.id}
            className={`rounded-xl border p-3 ${on ? 'border-line bg-surface' : 'border-line/60'}`}
          >
            <p className={`text-sm font-medium ${on ? 'text-reward' : 'text-dim'}`}>{badge.name}</p>
            <p className={`mt-0.5 text-xs ${on ? 'text-muted' : 'text-dim'}`}>{badge.hint}</p>
          </li>
        );
      })}
    </ul>
  );
}
