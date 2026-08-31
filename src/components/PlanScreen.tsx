import type { Task } from '../db/types';
import { horizonOrder } from '../lib/horizon';
import { templateByKey } from '../lib/templates';
import { daysUntil, dueLabel } from '../lib/time';

type GroupKey = 'past' | 'today' | 'tomorrow' | 'week' | 'later' | 'undated';

const GROUP_LABELS: Record<GroupKey, string> = {
  past: 'Past due',
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This week',
  later: 'Later',
  undated: 'No date',
};

function groupOf(task: Task): GroupKey {
  if (!task.deadline) return 'undated';
  const days = daysUntil(task.deadline);
  if (days < 0) return 'past';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return 'week';
  return 'later';
}

/**
 * Plan is the only screen allowed to talk about schedule variance — "past due"
 * lives here and nowhere else, because the user came looking for it. V2 adds the
 * calendar, daily pace targets and ahead/behind status to this screen.
 */
export default function PlanScreen({
  tasks,
  done,
  onPick,
  onComplete,
}: {
  tasks: Task[];
  done: Task[];
  onPick: (task: Task) => void;
  onComplete: (task: Task) => void;
}) {
  const groups = (Object.keys(GROUP_LABELS) as GroupKey[])
    .map((key) => ({ key, items: horizonOrder(tasks.filter((t) => groupOf(t) === key)) }))
    .filter((g) => g.items.length > 0);

  const pastDue = tasks.filter((t) => groupOf(t) === 'past').length;

  return (
    <div className="pt-safe pb-8">
      <header className="mb-5 px-5">
        <h1 className="text-2xl font-semibold">Plan</h1>
        <p className="mt-1 text-sm text-ink-3">
          {tasks.length} active
          {pastDue > 0 && ` · ${pastDue} past due`}
        </p>
      </header>

      {groups.length === 0 && (
        <p className="px-5 text-sm text-ink-3">No active tasks. Add one from the Now screen.</p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="mb-6" aria-labelledby={`group-${group.key}`}>
          <h2
            id={`group-${group.key}`}
            className="mb-2 flex items-center gap-2 px-5 text-sm font-medium text-ink-2"
          >
            {group.key === 'past' && <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden="true" />}
            {GROUP_LABELS[group.key]}
          </h2>
          <ul className="px-5">
            {group.items.map((task) => (
              <li key={task.id} className="flex items-center gap-2 border-b border-line/60 last:border-0">
                <button type="button" onClick={() => onPick(task)} className="flex-1 py-3 text-left">
                  <span className="block text-sm text-ink">{task.title}</span>
                  <span className="mt-0.5 block text-xs text-ink-3">
                    {templateByKey(task.type).label}
                    {task.deadline ? ` · ${dueLabel(task.deadline)}` : ''}
                    {task.urgency === 3 ? ' · urgent' : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onComplete(task)}
                  aria-label={`Mark "${task.title}" done`}
                  className="h-10 w-10 shrink-0 rounded-full border border-line text-ink-3"
                >
                  ✓
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {done.length > 0 && (
        <section className="px-5" aria-labelledby="group-done">
          <h2 id="group-done" className="mb-2 text-sm font-medium text-ink-2">
            Recently done
          </h2>
          <ul className="text-sm text-ink-3">
            {done.slice(0, 6).map((task) => (
              <li key={task.id} className="border-b border-line/60 py-2.5 last:border-0">
                {task.title}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
