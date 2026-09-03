import type { Progress } from '../db/types';
import { levelProgress } from '../lib/levels';
import { questToday } from '../lib/momentum';

const RADIUS = 21;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The gamification layer, and every mechanic in it is additive: XP and levels
 * only ever climb, momentum steps down by a day rather than shattering, and the
 * daily quest resets to a fresh target instead of recording a loss. Nothing here
 * can take anything away — the moment an app can punish you, opening it becomes
 * risky and avoidance wins.
 */
export default function ProgressHeader({
  progress,
  momentum,
  today,
}: {
  progress: Progress | undefined;
  momentum: number;
  today: string;
}) {
  const totalXp = progress?.totalXp ?? 0;
  const { level, title, into, span, fraction } = levelProgress(totalXp);
  const quest = questToday(progress, today);
  const questMet = quest.done >= quest.target;

  return (
    <section aria-label="Progress" className="mx-5 mt-4 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3.5">
        <div className="relative shrink-0">
          <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r={RADIUS} fill="none" stroke="var(--pal-line)" strokeWidth="4" />
            <circle
              cx="26"
              cy="26"
              r={RADIUS}
              fill="none"
              stroke="var(--pal-reward)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
              transform="rotate(-90 26 26)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-base font-semibold tabular-nums">
            {level}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-tight font-semibold">{title}</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-reward"
              style={{ width: `${Math.round(fraction * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-dim tabular-nums">
            {into} / {span} XP to level {level + 1}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-xs">
        <p className="text-muted">
          Momentum <span className="text-text tabular-nums">{momentum}</span>{' '}
          {momentum === 1 ? 'day' : 'days'}
        </p>
        <p className={questMet ? 'text-accent' : 'text-muted'}>
          {questMet ? (
            <>Daily quest done · {quest.done} sprints</>
          ) : (
            <>
              <span className="tabular-nums">
                {quest.done} of {quest.target}
              </span>{' '}
              sprints today
            </>
          )}
        </p>
      </div>
    </section>
  );
}
