import Sheet from './Sheet';
import type { Task } from '../db/types';
import { horizonOrder } from '../lib/horizon';
import { templateByKey } from '../lib/templates';
import { dueLabel } from '../lib/time';

/**
 * Any task, any time — the list is a menu, not a queue. Nothing here forces an
 * order, because being told which task to do next is how people bounce off.
 */
export default function TaskPicker({
  open,
  onClose,
  tasks,
  onPick,
  onNew,
}: {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onPick: (task: Task) => void;
  onNew: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Pick a task">
      <button
        type="button"
        onClick={onNew}
        className="w-full rounded-2xl border border-dashed border-line py-3.5 text-sm text-accent-ink"
        data-no-autofocus
      >
        + New task
      </button>
      <ul className="mt-3 space-y-1">
        {horizonOrder(tasks).map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onPick(task)}
              className="w-full rounded-2xl px-3 py-3 text-left hover:bg-surface-2"
              data-no-autofocus
            >
              <span className="block text-sm text-ink">{task.title}</span>
              <span className="mt-0.5 block text-xs text-ink-3">
                {templateByKey(task.type).label}
                {task.deadline ? ` · ${dueLabel(task.deadline)}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
