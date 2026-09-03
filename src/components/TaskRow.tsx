import type { Task } from '../db/types';
import Chip from './Chip';
import { PRIORITY_META } from './meta';
import { timeBucketLabel, sprintsNeeded } from '../lib/buckets';
import { taskXp } from '../lib/xp';
import { dueLabel } from '../lib/time';

/**
 * A row, not a card. The coloured bar is the scanning signal; everything else is
 * detail you read once you've landed. Tapping one opens the focus view.
 */
export default function TaskRow({
  task,
  sprintsDone,
  editing,
  onOpen,
  onDelete,
}: {
  task: Task;
  sprintsDone: number;
  editing: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const priority = PRIORITY_META[task.priority];
  const planned = sprintsNeeded(task.estimatedMinutes, task.sprintLength);

  return (
    <li className="relative border-b border-line/70 last:border-0">
      <span
        aria-hidden="true"
        className={`absolute top-3 bottom-3 left-0 w-[3px] rounded-full ${priority.bar}`}
      />

      <div className="py-4 pl-4">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="text-left font-display text-[17px] leading-snug font-semibold"
        >
          {task.title}
        </button>
        {editing ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete "${task.title}"`}
            className="-mt-1 shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-muted"
          >
            Delete
          </button>
        ) : (
          <span className="shrink-0 text-sm font-medium text-reward tabular-nums">{taskXp(task)} XP</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${priority.dot}`} />
          {priority.label}
        </span>
        <Chip>{task.cognitiveLoad}</Chip>
        <Chip>{timeBucketLabel(task.timeBucket)}</Chip>
      </div>

      <p className="mt-1.5 text-xs text-dim">
        {sprintsDone} of {planned} {planned === 1 ? 'sprint' : 'sprints'}
        {task.deadline ? ` · due ${dueLabel(task.deadline)}` : ''}
      </p>
      </div>
    </li>
  );
}
