import { useState } from 'react';
import { useCountUp } from '../lib/useCountUp';
import { formatDuration } from '../lib/time';

export interface SprintResult {
  sprintId: number;
  status: 'completed' | 'paused' | 'stopped';
  xpAwarded: number;
  focusedMinutes: number;
  goalText: string;
  /** True when the sprint ended by the user calling the goal done. */
  goalAlreadyDone: boolean;
  hasSteps: boolean;
}

/**
 * The payoff screen. XP counts up here — after the sprint, where it reads as
 * reward, rather than during it, where it would be something to watch instead of
 * work.
 *
 * The goal question has no wrong answer: "not yet" simply leaves the step
 * available, which is why it sits beside "done" rather than under it.
 */
export default function SprintDone({
  result,
  onGoalDone,
  onAnother,
  onTaskComplete,
  onBack,
}: {
  result: SprintResult;
  onGoalDone: () => void;
  onAnother: () => void;
  onTaskComplete: () => void;
  onBack: () => void;
}) {
  const [answered, setAnswered] = useState(result.goalAlreadyDone);
  const xp = useCountUp(result.xpAwarded);

  const heading =
    result.status === 'completed' ? 'Sprint done' : result.status === 'paused' ? 'Paused there' : 'Stopped there';

  return (
    <div className="flex h-full flex-col justify-between px-6 pt-safe pb-safe">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="font-display text-2xl font-semibold">{heading}</h1>
        <p className="mt-6 font-display text-6xl font-semibold text-reward tabular-nums">+{xp}</p>
        <p className="mt-1 text-sm text-muted">
          XP · {formatDuration(result.focusedMinutes)} focused
        </p>

        {result.hasSteps && !answered && (
          <div className="mt-10 w-full">
            <p className="text-sm text-muted">Did this get done?</p>
            <p className="mt-1 text-base text-balance">{result.goalText}</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onGoalDone();
                  setAnswered(true);
                }}
                className="flex-1 rounded-xl border border-line py-3 text-base"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setAnswered(true)}
                className="flex-1 rounded-xl border border-line py-3 text-base text-muted"
              >
                Not yet
              </button>
            </div>
            <p className="mt-2 text-xs text-dim">Either way it stays available.</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onAnother}
          className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-bg"
        >
          Another sprint
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onTaskComplete}
            className="flex-1 rounded-xl border border-line py-3.5 text-base"
          >
            Task complete
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-xl border border-line py-3.5 text-base text-muted"
          >
            That's it for now
          </button>
        </div>
      </div>
    </div>
  );
}
