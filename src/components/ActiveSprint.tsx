import { useEffect, useRef, useState } from 'react';
import type { Sprint } from '../db/types';
import { remainingMs, sprintProgress } from '../lib/sprintClock';
import { formatClock } from '../lib/time';

const RADIUS = 104;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The one screen where the gamification layer goes silent. No XP, no level, no
 * momentum, no progress to audit — stimulation drops rather than rises.
 *
 * The ring is the hero and the only motion the app signs with; the task title
 * shrinks to a whisper because you already know what you're doing; the goal is
 * the only content, because that is the thing you agreed to do.
 */
export default function ActiveSprint({
  sprint,
  taskTitle,
  onPause,
  onResume,
  onGoalDone,
  onStop,
  onElapsed,
}: {
  sprint: Sprint;
  taskTitle: string;
  onPause: () => void;
  onResume: () => void;
  onGoalDone: () => void;
  onStop: () => void;
  onElapsed: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const paused = Boolean(sprint.pausedAt);
  const left = remainingMs(sprint, now);
  const progress = sprintProgress(sprint, now);

  useEffect(() => {
    if (left > 0 || fired.current) return;
    fired.current = true;
    onElapsed();
  }, [left, onElapsed]);

  return (
    <div className="flex h-full flex-col justify-between px-6 pt-safe pb-safe">
      <p className="text-center text-xs text-dim">{taskTitle}</p>

      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width="240" height="240" viewBox="0 0 240 240" aria-hidden="true">
            <circle cx="120" cy="120" r={RADIUS} fill="none" stroke="var(--pal-line)" strokeWidth="8" />
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              fill="none"
              stroke={paused ? 'var(--pal-dim)' : 'var(--pal-accent)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              transform="rotate(-90 120 120)"
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-display text-5xl font-semibold tabular-nums"
              role="timer"
              aria-live="off"
              aria-label={`${Math.ceil(left / 60000)} minutes left`}
            >
              {formatClock(left)}
            </span>
            {paused && <span className="mt-1 text-sm text-dim">Paused</span>}
          </div>
        </div>

        <p className="mt-8 max-w-xs text-center text-lg leading-snug text-balance">
          {sprint.goalText || 'Just make a start.'}
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onGoalDone}
          className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-bg active:opacity-85"
        >
          Goal done
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={paused ? onResume : onPause}
            className="flex-1 rounded-xl border border-line py-3.5 text-base"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex-1 rounded-xl border border-line py-3.5 text-base text-muted"
          >
            Stop here
          </button>
        </div>
      </div>
    </div>
  );
}
