import type { Task } from '../db/types';
import type { TaskPace } from '../lib/pace';
import { dueLabel } from '../lib/time';

/**
 * The one place schedule variance is allowed to appear — Plan, where the user
 * went looking for it.
 *
 * Even here it is stated as the target ahead, never the debt behind: no "three
 * sprints behind", no deficit count, no red. Falling behind only changes the
 * number and turns it amber, and the sentence stays a plan you can act on.
 */
export default function PaceBlock({ task, pace }: { task: Task; pace: TaskPace }) {
  return (
    <li className="border-b border-line/70 py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm">{task.title}</p>
        <p className="shrink-0 text-xs text-dim tabular-nums">
          {pace.done} of {pace.needed} sprints
        </p>
      </div>
      <p className={`mt-1 text-sm ${pace.behind ? 'text-warn' : 'text-muted'}`}>
        {pace.perDay} {pace.perDay === 1 ? 'sprint' : 'sprints'} a day
        {pace.behind ? ' now' : ''} hits {dueLabel(task.deadline!)}
        <span className="text-dim">
          {' '}
          · {pace.daysLeft} {pace.daysLeft === 1 ? 'day' : 'days'} left
        </span>
      </p>
    </li>
  );
}
