import { useState } from 'react';
import type { Progress, Task } from '../db/types';
import TaskRow from './TaskRow';
import ProgressHeader from './ProgressHeader';
import HorizonStrip from './HorizonStrip';
import { sortForList } from '../lib/ordering';

export default function NowScreen({
  tasks,
  sprintsDone,
  progress,
  momentum,
  today,
  onNewTask,
  onOpen,
  onOpenPlan,
  onOpenTheme,
  onDelete,
}: {
  tasks: Task[];
  sprintsDone: Map<number, number>;
  progress: Progress | undefined;
  momentum: number;
  today: string;
  onNewTask: () => void;
  onOpen: (task: Task) => void;
  onOpenPlan: () => void;
  onOpenTheme: () => void;
  onDelete: (task: Task) => void;
}) {
  const [editing, setEditing] = useState(false);
  const sorted = sortForList(tasks);

  return (
    <div className="flex flex-1 flex-col pt-safe">
      <header className="flex items-baseline justify-between px-5">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Now</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenTheme}
            aria-label="Settings"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line lg:hidden"
          >
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent" />
          </button>
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

      <ProgressHeader progress={progress} momentum={momentum} today={today} />

      {sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="font-display text-lg">Nothing on the list.</p>
          <p className="mt-2 text-sm text-muted">
            Add a task and you'll get the steps and a sprint length with it.
          </p>
          <button
            type="button"
            onClick={onNewTask}
            className="mt-6 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-on-accent active:opacity-85"
          >
            Add a task
          </button>
        </div>
      ) : (
        <>
        <ul className="mt-4 px-5">
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
        <HorizonStrip tasks={tasks} onOpenPlan={onOpenPlan} onOpen={onOpen} />
        </>
      )}
    </div>
  );
}
