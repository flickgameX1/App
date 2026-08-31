import { useEffect, useMemo, useState } from 'react';
import type { Step, Task } from '../db/types';
import { templateByKey } from '../lib/templates';
import { MAX_SPRINT, MIN_SPRINT, suggestSprintLength } from '../lib/sprint';
import { makeStep } from '../lib/breakdowns';
import { dueLabel, formatDuration } from '../lib/time';

const VISIBLE_STEPS = 4;

interface TaskCardProps {
  task: Task;
  /** True when this type's steps came from the user's own saved version. */
  personalised: boolean;
  onStart: (minutes: number) => void;
  onToggleStep: (stepId: string, done: boolean) => void;
  onSaveSteps: (steps: Step[]) => void;
  onComplete: () => void;
  onSwitch: () => void;
}

export default function TaskCard({
  task,
  personalised,
  onStart,
  onToggleStep,
  onSaveSteps,
  onComplete,
  onSwitch,
}: TaskCardProps) {
  const suggested = useMemo(() => suggestSprintLength(task), [task]);
  const [minutes, setMinutes] = useState(suggested);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<Step[]>(task.steps);

  // A different task means a different suggestion; don't carry the old one over.
  useEffect(() => {
    setMinutes(suggested);
    setEditing(false);
    setExpanded(false);
  }, [task.id, suggested]);

  const template = templateByKey(task.type);
  const doneCount = task.steps.filter((s) => s.done).length;

  // Collapsed, the card shows a short window starting at whatever is next —
  // the whole mountain at once is the thing that makes people close the app,
  // and keeping the card short keeps the horizon strip on screen.
  const nextIndex = Math.max(0, task.steps.findIndex((s) => !s.done));
  const visibleSteps = expanded
    ? task.steps
    : task.steps.slice(nextIndex, nextIndex + VISIBLE_STEPS);
  const hiddenCount = task.steps.length - visibleSteps.length;

  const startEditing = () => {
    setDraft(task.steps.length ? task.steps : [makeStep('')]);
    setEditing(true);
  };

  const save = () => {
    onSaveSteps(draft.filter((s) => s.text.trim().length > 0));
    setEditing(false);
  };

  return (
    <article className="mx-5 rounded-3xl border border-line bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-3">
            {template.label}
            {task.deadline && ` · ${dueLabel(task.deadline)}`}
          </p>
          <h1 className="mt-1 text-2xl leading-tight font-semibold">{task.title}</h1>
        </div>
        <button type="button" onClick={onSwitch} className="shrink-0 pt-1 text-sm text-accent-ink">
          Switch
        </button>
      </header>

      <section className="mt-4" aria-label="Breakdown">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-ink-2">
            Steps{' '}
            <span className="text-ink-3">
              {doneCount}/{task.steps.length}
            </span>
          </h2>
          {editing ? (
            <div className="flex gap-3 text-sm">
              <button type="button" onClick={() => setEditing(false)} className="text-ink-3">
                Cancel
              </button>
              <button type="button" onClick={save} className="text-accent-ink">
                Save
              </button>
            </div>
          ) : (
            <button type="button" onClick={startEditing} className="text-sm text-accent-ink">
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            {draft.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <input
                  value={step.text}
                  onChange={(e) =>
                    setDraft(draft.map((s) => (s.id === step.id ? { ...s, text: e.target.value } : s)))
                  }
                  aria-label={`Step ${i + 1}`}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setDraft(draft.filter((s) => s.id !== step.id))}
                  aria-label={`Remove step ${i + 1}`}
                  className="px-2 text-lg text-ink-3"
                >
                  −
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDraft([...draft, makeStep('')])}
              className="text-sm text-accent-ink"
            >
              + Add step
            </button>
            {task.type !== 'general' && (
              <p className="pt-1 text-xs text-ink-3">
                Saving keeps this as your version of “{template.label}”.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            {visibleSteps.map((step) => (
              <li key={step.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl py-2 pr-1">
                  <input
                    type="checkbox"
                    checked={step.done}
                    onChange={(e) => onToggleStep(step.id, e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                  />
                  <span className={`text-sm leading-snug ${step.done ? 'text-ink-3 line-through' : 'text-ink'}`}>
                    {step.text}
                  </span>
                </label>
              </li>
            ))}
            {hiddenCount > 0 && (
              <li>
                <button type="button" onClick={() => setExpanded(true)} className="py-1 text-sm text-accent-ink">
                  Show all {task.steps.length} steps
                </button>
              </li>
            )}
            {expanded && task.steps.length > VISIBLE_STEPS && (
              <li>
                <button type="button" onClick={() => setExpanded(false)} className="py-1 text-sm text-ink-3">
                  Show fewer
                </button>
              </li>
            )}
            {personalised && <li className="pt-1 text-xs text-ink-3">Your version of this breakdown.</li>}
          </ul>
        )}
      </section>

      <section className="mt-5" aria-label="Sprint length">
        <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-2">
          <button
            type="button"
            onClick={() => setMinutes((m) => Math.max(MIN_SPRINT, m - 5))}
            aria-label="Five minutes shorter"
            className="h-11 w-11 rounded-xl text-xl text-ink-2"
          >
            −
          </button>
          <div className="text-center">
            <span className="text-lg font-semibold">{formatDuration(minutes)}</span>
            <span className="block text-xs text-ink-3">
              {minutes === suggested ? 'suggested' : `suggested ${formatDuration(suggested)}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMinutes((m) => Math.min(MAX_SPRINT, m + 5))}
            aria-label="Five minutes longer"
            className="h-11 w-11 rounded-xl text-xl text-ink-2"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => onStart(minutes)}
          className="mt-3 w-full rounded-2xl bg-accent py-4 text-base font-semibold text-white"
        >
          Start sprint
        </button>
        <button type="button" onClick={onComplete} className="mt-1 w-full py-2 text-sm text-ink-3">
          Mark task done
        </button>
      </section>
    </article>
  );
}
