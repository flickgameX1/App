import { useEffect, useRef, useState } from 'react';
import type { Sprint, SprintStatus, Task } from '../db/types';
import { focusedMs, remainingMs } from '../lib/sprint';
import { formatClock } from '../lib/time';

const RADIUS = 108;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function SprintScreen({
  sprint,
  task,
  onPause,
  onResume,
  onToggleStep,
  onStop,
  onElapsed,
}: {
  sprint: Sprint;
  task: Task;
  onPause: () => void;
  onResume: () => void;
  onToggleStep: (stepId: string, done: boolean) => void;
  onStop: () => void;
  onElapsed: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const firedElapsed = useRef(false);

  // Tick off the wall clock rather than counting intervals, so backgrounding the
  // PWA (or locking the phone) doesn't leave the timer behind.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const paused = Boolean(sprint.pausedAt);
  const left = remainingMs(sprint, now);
  const total = sprint.plannedLength * 60_000;
  const progress = Math.min(1, Math.max(0, focusedMs(sprint, now) / total));

  useEffect(() => {
    if (left > 0 || firedElapsed.current) return;
    firedElapsed.current = true;
    onElapsed();
  }, [left, onElapsed]);

  const currentStep = task.steps.find((s) => !s.done);

  return (
    <div className="flex min-h-full flex-col justify-between px-5 pt-safe pb-safe">
      <header className="text-center">
        <p className="text-xs text-ink-3">Sprint · {sprint.plannedLength} min</p>
        <h1 className="mt-1 text-lg font-medium">{task.title}</h1>
      </header>

      <div className="flex flex-col items-center py-6">
        <div className="relative">
          <svg width="248" height="248" viewBox="0 0 248 248" aria-hidden="true">
            <circle cx="124" cy="124" r={RADIUS} fill="none" stroke="var(--color-surface-2)" strokeWidth="10" />
            <circle
              cx="124"
              cy="124"
              r={RADIUS}
              fill="none"
              stroke={paused ? 'var(--color-ink-3)' : 'var(--color-accent)'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              transform="rotate(-90 124 124)"
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-5xl font-semibold tabular-nums"
              role="timer"
              aria-live="off"
              aria-label={`${Math.ceil(left / 60000)} minutes left`}
            >
              {formatClock(left)}
            </span>
            {paused && <span className="mt-1 text-sm text-ink-3">Paused</span>}
          </div>
        </div>

        {currentStep && (
          <p className="mt-6 max-w-xs text-center text-base text-ink-2">{currentStep.text}</p>
        )}
      </div>

      <section aria-label="Steps" className="no-scrollbar max-h-44 overflow-y-auto">
        <ul className="space-y-1">
          {task.steps.map((step) => (
            <li key={step.id}>
              <label className="flex items-start gap-3 rounded-xl py-1.5">
                <input
                  type="checkbox"
                  checked={step.done}
                  onChange={(e) => onToggleStep(step.id, e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                />
                <span className={`text-sm leading-snug ${step.done ? 'text-ink-3 line-through' : 'text-ink-2'}`}>
                  {step.text}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={paused ? onResume : onPause}
          className="flex-1 rounded-2xl border border-line bg-surface py-4 text-base font-medium"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={onStop}
          className="flex-1 rounded-2xl border border-line bg-surface py-4 text-base font-medium text-ink-2"
        >
          Stop
        </button>
      </div>
    </div>
  );
}

export type StopChoice = Extract<SprintStatus, 'paused' | 'scrapped'> | 'task-done';
