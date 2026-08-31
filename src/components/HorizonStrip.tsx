import type { Task } from '../db/types';
import { horizonOrder } from '../lib/horizon';
import { dueLabel } from '../lib/time';
import { templateByKey } from '../lib/templates';

/**
 * The horizon strip shows what is coming and nothing else.
 *
 * Hard rule: no variance here. No "behind" count, no overdue badge, no red. A
 * landing screen that opens with how far behind you are is a landing screen you
 * stop opening — which is the exact failure this app exists to avoid. Schedule
 * variance lives in Plan, where the user went looking for it.
 */
export default function HorizonStrip({
  tasks,
  onOpenPlan,
  onPick,
}: {
  tasks: Task[];
  onOpenPlan: () => void;
  onPick: (task: Task) => void;
}) {
  const upcoming = horizonOrder(tasks).slice(0, 5);

  return (
    <section aria-labelledby="horizon-heading" className="mt-5">
      <div className="mb-2 flex items-baseline justify-between px-5">
        <h2 id="horizon-heading" className="text-sm font-medium text-ink-2">
          Coming up
        </h2>
        <button type="button" onClick={onOpenPlan} className="text-sm text-accent-ink">
          Plan
        </button>
      </div>

      {upcoming.length === 0 ? (
        <p className="px-5 text-sm text-ink-3">Nothing else on the list.</p>
      ) : (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
          {upcoming.map((task) => (
            <li key={task.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onPick(task)}
                className="flex h-20 w-36 flex-col justify-between rounded-2xl border border-line bg-surface p-3 text-left"
              >
                <span className="flex items-center gap-1.5 text-xs text-ink-3">
                  {task.urgency === 3 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  )}
                  {task.deadline ? dueLabel(task.deadline) : templateByKey(task.type).label}
                </span>
                <span className="line-clamp-2 text-sm leading-snug text-ink">{task.title}</span>
              </button>
            </li>
          ))}
          <li className="shrink-0">
            <button
              type="button"
              onClick={onOpenPlan}
              className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-line text-sm text-ink-3"
            >
              All
            </button>
          </li>
        </ul>
      )}
    </section>
  );
}
