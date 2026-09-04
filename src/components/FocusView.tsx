import { useEffect, useMemo, useState } from 'react';
import type { Step, Task } from '../db/types';
import Chip from './Chip';
import SprintProgress from './SprintProgress';
import XpSparkline from './XpSparkline';
import { PRIORITY_META } from './meta';
import { sprintsNeeded, timeBucketLabel } from '../lib/buckets';
import { taskXp } from '../lib/xp';
import { goalFromSteps, xpPreview } from '../lib/goal';
import { daysUntil, dueLabel } from '../lib/time';

/**
 * Tackling one task. Everything else is gone — no list, no other tasks, no tab
 * bar — because this is where the cognitive load is supposed to drop.
 *
 * The steps are options, not a checklist the app walks you through: you pick
 * which piece this sprint is for, in any order, because the piece you can
 * actually face right now often isn't the next one in sequence.
 */
export default function FocusView({
  task,
  steps,
  sprintsDone,
  recentXp,
  onBack,
  onSaveSteps,
  onStart,
}: {
  task: Task;
  steps: Step[];
  sprintsDone: number;
  recentXp: number[];
  onBack: () => void;
  onSaveSteps: (texts: string[]) => void;
  onStart: (goalText: string, stepIds: number[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [goal, setGoal] = useState('');
  const [goalIsMine, setGoalIsMine] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  const planned = sprintsNeeded(task.estimatedMinutes, task.sprintLength);
  const total = taskXp(task);
  const xp = xpPreview(total, planned, sprintsDone);
  const priority = PRIORITY_META[task.priority];

  // Picking steps writes the goal; typing your own keeps it until the selection
  // changes again.
  const suggested = useMemo(() => goalFromSteps(steps, selected), [steps, selected]);
  useEffect(() => {
    if (!goalIsMine) setGoal(suggested);
  }, [suggested, goalIsMine]);

  const toggle = (stepId: number) => {
    setGoalIsMine(false);
    setSelected((ids) => (ids.includes(stepId) ? ids.filter((i) => i !== stepId) : [...ids, stepId]));
  };

  const startEditing = () => {
    setDraft(steps.map((s) => s.text));
    setEditing(true);
  };

  const save = () => {
    onSaveSteps(draft);
    setSelected([]);
    setGoalIsMine(false);
    setEditing(false);
  };

  const days = task.deadline === undefined ? null : daysUntil(task.deadline);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pt-safe pb-safe">
      {/* On a wide screen the list is already beside this pane, so there is
          nothing to go back to. */}
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 self-start py-1 text-sm text-muted lg:hidden"
      >
        ← Back
      </button>

      <header className="mt-3">
        <h1 className="font-display text-[26px] leading-tight font-semibold">{task.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${priority.dot}`} />
            {priority.label}
          </span>
          <Chip>{task.cognitiveLoad}</Chip>
          <Chip>{timeBucketLabel(task.timeBucket)}</Chip>
        </div>
        {task.deadline !== undefined && (
          <p className="mt-2 text-xs text-muted">
            Due {dueLabel(task.deadline)}
            {days !== null && days > 0 && (
              <span className="text-dim"> · {days} {days === 1 ? 'day' : 'days'}</span>
            )}
          </p>
        )}
      </header>

      <div className="mt-5">
        <SprintProgress done={sprintsDone} planned={planned} />
      </div>

      <section className="mt-7" aria-labelledby="goal-heading">
        <h2 id="goal-heading" className="mb-2 text-sm text-muted">
          This sprint is for
        </h2>
        {/* A textarea, not an input: goals built from two or three steps run past
            one line, and a goal you cannot read is not a goal. */}
        <textarea
          value={goal}
          onChange={(e) => {
            setGoal(e.target.value);
            setGoalIsMine(true);
          }}
          rows={2}
          placeholder="Pick a step below, or type your own"
          aria-label="Sprint goal"
          className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-base leading-snug outline-none placeholder:text-dim focus:border-accent"
        />
      </section>

      <section className="mt-6" aria-labelledby="steps-heading">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="steps-heading" className="text-sm text-muted">
            Steps <span className="text-dim">· tap any of them, in any order</span>
          </h2>
          {editing ? (
            <div className="flex gap-3 text-sm">
              <button type="button" onClick={() => setEditing(false)} className="text-dim">
                Cancel
              </button>
              <button type="button" onClick={save} className="text-accent">
                Save
              </button>
            </div>
          ) : (
            <button type="button" onClick={startEditing} className="text-sm text-accent">
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            {draft.map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setDraft(draft.map((t, j) => (j === i ? e.target.value : t)))}
                  aria-label={`Step ${i + 1}`}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                  aria-label={`Remove step ${i + 1}`}
                  className="px-2 text-lg text-dim"
                >
                  −
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setDraft([...draft, ''])} className="text-sm text-accent">
              + Add step
            </button>
            {task.type !== 'general' && (
              <p className="pt-1 text-xs text-dim">Saving keeps these as your steps for this kind of task.</p>
            )}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {steps.map((step) => {
              const on = step.id !== undefined && selected.includes(step.id);
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => step.id !== undefined && toggle(step.id)}
                    aria-pressed={on}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left ${
                      on ? 'border-accent bg-surface' : 'border-line'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                        on ? 'border-accent bg-accent' : 'border-line'
                      }`}
                    />
                    <span className={`text-sm leading-snug ${step.done ? 'text-dim line-through' : ''}`}>
                      {step.text}
                    </span>
                  </button>
                </li>
              );
            })}
            {steps.length === 0 && <li className="text-sm text-dim">No steps yet — add some with Edit.</li>}
          </ul>
        )}
      </section>

      {/*
        Motivation data belongs either side of a sprint, never during one: from
        stage 3 this block dims while the timer runs, so it can't become
        something to watch instead of work.
      */}
      <section className="mt-7 flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3">
        <div>
          <p className="text-sm">
            <span className="text-reward tabular-nums">+{xp.perSprint} XP</span>
            <span className="text-muted"> this sprint</span>
          </p>
          <p className="mt-0.5 text-xs text-dim tabular-nums">{xp.remaining} XP left on the task</p>
        </div>
        <XpSparkline values={recentXp} />
      </section>

      <div className="mt-6 mb-2">
        <button
          type="button"
          onClick={() => onStart(goal, selected)}
          className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-on-accent active:opacity-85"
        >
          Start {task.sprintLength} min sprint
        </button>
      </div>
    </div>
  );
}
