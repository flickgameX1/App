import { useState } from 'react';
import type { Task } from '../db/types';
import TaskRow from './TaskRow';
import { sortForList } from '../lib/ordering';

export default function NowScreen({
  tasks,
  sprintsDone,
  onNewTask,
  onOpen,
  onDelete,
}: {
  tasks: Task[];
  sprintsDone: Map<number, number>;
  onNewTask: () => void;
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const [editing, setEditing] = useState(false);
  const sorted = sortForList(tasks);

  return (
    <div className="flex flex-1 flex-col pt-safe">
      <header className="flex items-baseline justify-between px-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Now</h1>
        <div className="flex items-center gap-4">
          {tasks.length > 0 && (
            <button type="button" onClick={() => setEditing((v) => !v)} className="text-sm text-muted">
              {editing ? 'Done' : 'Edit'}
            </button>
          )}
          <button type="button" onClick={onNewTask} className="text-sm font-medium text-accent">
            + Task
          </button>
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="font-display text-lg">Nothing on the list.</p>
          <p className="mt-2 text-sm text-muted">
            Add a task and you'll get the steps and a sprint length with it.
          </p>
          <button
            type="button"
            onClick={onNewTask}
            className="mt-6 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-bg"
          >
            Add a task
          </button>
        </div>
      ) : (
        <ul className="mt-2 px-5">
          {sorted.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              sprintsDone={sprintsDone.get(task.id!) ?? 0}
              editing={editing}
              onOpen={() => onOpen(task)}
              onDelete={() => onDelete(task)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
