import Sheet from './Sheet';
import type { StopChoice } from './SprintScreen';
import { formatDuration } from '../lib/time';

/**
 * Stopping early is a normal outcome, so this sheet has no "give up" option and
 * no warning tone: every path out of a sprint keeps the time you did.
 */
export function StopSheet({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (choice: StopChoice) => void;
}) {
  const options: { choice: StopChoice; label: string; hint: string }[] = [
    { choice: 'paused', label: 'Resume later', hint: 'Stays on your list, right where you left it.' },
    { choice: 'scrapped', label: 'Done for now', hint: 'Nothing lost — the time you did still counts.' },
    { choice: 'task-done', label: 'The task is finished', hint: 'Log it as complete.' },
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Stopping here?">
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o.choice}>
            <button
              type="button"
              onClick={() => onChoose(o.choice)}
              className="w-full rounded-2xl border border-line bg-surface-2 p-4 text-left"
              data-no-autofocus
            >
              <span className="block text-base font-medium">{o.label}</span>
              <span className="mt-0.5 block text-sm text-ink-3">{o.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="mt-4 w-full py-3 text-sm text-ink-3" data-no-autofocus>
        Keep going
      </button>
    </Sheet>
  );
}

export function SprintDoneSheet({
  open,
  xp,
  focusMinutes,
  onAnother,
  onTaskDone,
  onClose,
}: {
  open: boolean;
  xp: number;
  focusMinutes: number;
  onAnother: () => void;
  onTaskDone: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Sprint done">
      <p className="text-sm text-ink-2">
        {formatDuration(focusMinutes)} focused · <span className="text-ink">+{xp} XP</span>
      </p>
      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={onAnother}
          className="w-full rounded-2xl bg-accent py-4 text-base font-semibold text-white"
          data-no-autofocus
        >
          Another sprint
        </button>
        <button
          type="button"
          onClick={onTaskDone}
          className="w-full rounded-2xl border border-line bg-surface-2 py-4 text-base font-medium"
          data-no-autofocus
        >
          Task complete
        </button>
        <button type="button" onClick={onClose} className="w-full py-3 text-sm text-ink-3" data-no-autofocus>
          That’s it for now
        </button>
      </div>
    </Sheet>
  );
}
