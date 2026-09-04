import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Sheet from './Sheet';
import type { CognitiveLoad, Priority } from '../db/types';
import type { NewTaskInput } from '../db/actions';
import { matchTemplate } from '../lib/matching';
import { stepCountFor } from '../lib/breakdowns';
import { sprintsNeeded, timeBucketFor, timeBucketLabel } from '../lib/buckets';
import { LOAD_MULTIPLIER, taskXp } from '../lib/xp';
import { pacePlan } from '../lib/pace';
import { daysUntil, dueLabel, formatDuration, parseDuration } from '../lib/time';
import { PRIORITY_META } from './meta';
import { PRIORITY_ORDER } from '../lib/priority';

const LOADS: CognitiveLoad[] = ['easy', 'moderate', 'challenging', 'impossible'];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-sm text-muted">
        {label}
        {hint && <span className="text-dim"> · {hint}</span>}
      </p>
      {children}
    </div>
  );
}

export default function NewTaskSheet({
  open,
  onClose,
  defaultSprintLength,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  defaultSprintLength: number;
  onAdd: (input: NewTaskInput) => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('second');
  const [load, setLoad] = useState<CognitiveLoad>('moderate');
  const [estimate, setEstimate] = useState('');
  const [sprintLength, setSprintLength] = useState(defaultSprintLength);
  const [deadline, setDeadline] = useState('');

  const type = useMemo(() => matchTemplate(title).template.key, [title]);
  const stepCount = useLiveQuery(() => stepCountFor(type), [type], 0);

  const minutes = parseDuration(estimate);
  const bucket = minutes === null ? null : timeBucketFor(minutes);
  const sprints = minutes === null ? 0 : sprintsNeeded(minutes, sprintLength);
  const xp = bucket === null ? 0 : taskXp({ timeBucket: bucket, cognitiveLoad: load });
  const deadlineMs = deadline ? new Date(`${deadline}T23:59:59`).getTime() : undefined;
  const pace = pacePlan(sprints, deadlineMs ? daysUntil(deadlineMs) : null);

  const ready = title.trim().length > 0 && minutes !== null && minutes > 0;

  const reset = () => {
    setTitle('');
    setPriority('second');
    setLoad('moderate');
    setEstimate('');
    setSprintLength(defaultSprintLength);
    setDeadline('');
  };

  const submit = () => {
    if (!ready || minutes === null) return;
    onAdd({ title, type, priority, cognitiveLoad: load, estimatedMinutes: minutes, sprintLength, deadline: deadlineMs });
    reset();
    onClose();
  };

  const inputClass =
    'w-full rounded-xl border border-line bg-bg px-4 py-3 text-base outline-none placeholder:text-dim focus:border-accent';

  return (
    <Sheet open={open} onClose={onClose} title="New task">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          aria-label="Task name"
          className={inputClass}
        />

        <Field label="Priority">
          <div className="flex gap-2">
            {PRIORITY_ORDER.map((p) => {
              const meta = PRIORITY_META[p];
              const on = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  aria-pressed={on}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm ${
                    on ? 'border-accent text-text' : 'border-line text-muted'
                  }`}
                >
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Cognitive load" hint="how hard it is to face, not how long">
          <div className="grid grid-cols-2 gap-2">
            {LOADS.map((l) => {
              const on = load === l;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLoad(l)}
                  aria-pressed={on}
                  className={`rounded-xl border py-2.5 text-sm ${
                    on ? 'border-accent text-text' : 'border-line text-muted'
                  }`}
                >
                  {l}
                  <span className="ml-1.5 text-xs text-dim">×{LOAD_MULTIPLIER[l]}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="How long in total" hint="type it — 90, 1h30, 2 hours">
          <input
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            inputMode="text"
            placeholder="e.g. 2h 30m"
            aria-label="Estimated total time"
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-dim">
            {estimate.trim() === ''
              ? ' '
              : minutes === null
                ? "Couldn't read that — try 90, 1h30 or 2 hours"
                : `${formatDuration(minutes)} · ${timeBucketLabel(timeBucketFor(minutes))} bucket`}
          </p>
        </Field>

        <Field label="Sprint length">
          <div className="flex items-center justify-between rounded-xl border border-line p-2">
            <button
              type="button"
              onClick={() => setSprintLength((m) => Math.max(5, m - 5))}
              aria-label="Five minutes shorter"
              className="h-10 w-10 rounded-lg text-xl text-muted"
            >
              −
            </button>
            <span className="text-base font-medium tabular-nums">{sprintLength} min</span>
            <button
              type="button"
              onClick={() => setSprintLength((m) => Math.min(90, m + 5))}
              aria-label="Five minutes longer"
              className="h-10 w-10 rounded-lg text-xl text-muted"
            >
              +
            </button>
          </div>
        </Field>

        <Field label="Deadline" hint="optional">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Deadline"
            className={inputClass}
          />
        </Field>

        <div className="mt-6 rounded-xl border border-line bg-bg p-4">
          <p className="text-sm">
            {sprints > 0 ? (
              <>
                <span className="font-medium tabular-nums">{sprints}</span>{' '}
                {sprints === 1 ? 'sprint' : 'sprints'} of {sprintLength} min
              </>
            ) : (
              <span className="text-dim">Add a duration to see the plan</span>
            )}
          </p>
          {sprints > 0 && (
            <p className="mt-1 text-sm text-muted">
              <span className="text-reward tabular-nums">{xp} XP</span> on completion · {stepCount} steps ready
            </p>
          )}
          {pace && deadlineMs && (
            <p className="mt-2 text-sm text-accent">
              {pace.sprintsPerDay} {pace.sprintsPerDay === 1 ? 'sprint' : 'sprints'} a day hits{' '}
              {dueLabel(deadlineMs)}
              <span className="text-muted">
                {' '}
                · {pace.daysLeft} {pace.daysLeft === 1 ? 'day' : 'days'}
              </span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!ready}
          className="mt-5 w-full rounded-xl bg-accent py-4 text-base font-semibold text-on-accent active:opacity-85 disabled:opacity-40"
        >
          Add task
        </button>
      </form>
    </Sheet>
  );
}
