import type { Task } from '../db/types';
import { PRIORITY_META } from './meta';
import { sortByDeadline } from '../lib/ordering';
import { dueLabel } from '../lib/time';

/**
 * A glanceable band of what's coming, on the landing screen.
 *
 * Hard rule: it shows what is coming and never how far behind you are. No
 * counts, no badges, no amber, no variance of any kind — that lives in Plan,
 * where the user chose to look at it. A landing screen that opens with how far
 * behind you are is a landing screen you stop opening, which is the exact
 * failure this app exists to prevent.
 */
export default function HorizonStrip({
  tasks,
  onOpenPlan,
  onOpen,
}: {
  tasks: Task[];
  onOpenPlan: () => void;
  onOpen: (task: Task) => void;
}) {
  const upcoming = sortByDeadline(tasks).slice(0, 5);
  if (upcoming.length === 0) return null;

  return (
    <section aria-labelledby="horizon-heading" className="mt-6">
      <div className="mb-2 flex items-baseline justify-between px-5">
        <h2 id="horizon-heading" className="text-sm text-muted">
          Coming up
        </h2>
        <button type="button" onClick={onOpenPlan} className="text-sm text-accent">
          Plan
        </button>
      </div>
      <ul className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1">
        {upcoming.map((task) => (
          <li key={task.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onOpen(task)}
              className="flex h-[84px] w-36 flex-col justify-between gap-1 rounded-xl border border-line bg-surface p-3 text-left"
            >
              <span className="flex items-center gap-1.5 text-[11px] text-dim">
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${PRIORITY_META[task.priority].dot}`} />
                {dueLabel(task.deadline!)}
              </span>
              <span className="line-clamp-2 text-sm leading-tight">{task.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
