import type { Step, Task } from '../db/types';
import TaskCard from './TaskCard';
import HorizonStrip from './HorizonStrip';

const QUICK_ADDS = ['Clean my room', 'Reply to emails', 'Study session', 'Washing up'];

export default function NowScreen({
  tasks,
  currentTask,
  personalised,
  onStart,
  onToggleStep,
  onSaveSteps,
  onComplete,
  onPickTask,
  onOpenPicker,
  onOpenAdd,
  onQuickAdd,
  onOpenPlan,
}: {
  tasks: Task[];
  currentTask: Task | null;
  personalised: boolean;
  onStart: (minutes: number) => void;
  onToggleStep: (stepId: string, done: boolean) => void;
  onSaveSteps: (steps: Step[]) => void;
  onComplete: () => void;
  onPickTask: (task: Task) => void;
  onOpenPicker: () => void;
  onOpenAdd: () => void;
  onQuickAdd: (title: string) => void;
  onOpenPlan: () => void;
}) {
  const others = tasks.filter((t) => t.id !== currentTask?.id);

  return (
    <div className="pt-safe pb-8">
      <header className="mb-4 flex items-center justify-between px-5">
        <h1 className="text-sm font-medium text-ink-3">Now</h1>
        <button type="button" onClick={onOpenAdd} className="text-sm text-accent-ink">
          + Task
        </button>
      </header>

      {currentTask ? (
        <TaskCard
          task={currentTask}
          personalised={personalised}
          onStart={onStart}
          onToggleStep={onToggleStep}
          onSaveSteps={onSaveSteps}
          onComplete={onComplete}
          onSwitch={onOpenPicker}
        />
      ) : (
        <section className="mx-5 rounded-3xl border border-line bg-surface p-6">
          <h2 className="text-xl font-semibold">What are you doing right now?</h2>
          <p className="mt-2 text-sm text-ink-2">
            Pick anything. You get the steps and a sprint length — you don’t have to work out where to
            start.
          </p>
          <button
            type="button"
            onClick={tasks.length ? onOpenPicker : onOpenAdd}
            className="mt-5 w-full rounded-2xl bg-accent py-4 text-base font-semibold text-white"
          >
            {tasks.length ? 'Pick a task' : 'Add a task'}
          </button>
          {tasks.length === 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs text-ink-3">Or start with one of these</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ADDS.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => onQuickAdd(title)}
                    className="rounded-full border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2"
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <HorizonStrip tasks={others} onOpenPlan={onOpenPlan} onPick={onPickTask} />
    </div>
  );
}
