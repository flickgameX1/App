import { useMemo, useState } from 'react';
import Sheet from './Sheet';
import type { Priority, Urgency } from '../db/types';
import { matchTemplate } from '../lib/matching';
import { ALL_TEMPLATES, templateByKey } from '../lib/templates';
import type { NewTaskInput } from '../db/actions';

const URGENCIES: { value: Urgency; label: string }[] = [
  { value: 1, label: 'Whenever' },
  { value: 2, label: 'Soon' },
  { value: 3, label: 'Today' },
];

const WEIGHTS: { value: Priority; label: string }[] = [
  { value: 1, label: 'Light' },
  { value: 2, label: 'Normal' },
  { value: 3, label: 'Heavy' },
];

function Chips<T extends number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="mb-2 text-sm text-ink-2">{label}</legend>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm ${
              value === o.value ? 'border-accent bg-accent/15 text-ink' : 'border-line bg-surface-2 text-ink-2'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function AddTaskSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: NewTaskInput) => void;
}) {
  const [title, setTitle] = useState('');
  const [typeOverride, setTypeOverride] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<Urgency>(2);
  const [priority, setPriority] = useState<Priority>(2);
  const [deadline, setDeadline] = useState('');

  const match = useMemo(() => matchTemplate(title), [title]);
  const type = typeOverride ?? match.template.key;
  const template = templateByKey(type);

  const reset = () => {
    setTitle('');
    setTypeOverride(null);
    setUrgency(2);
    setPriority(2);
    setDeadline('');
  };

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      title,
      type,
      urgency,
      priority,
      // A date input gives local midnight, which is what "due that day" means here.
      deadline: deadline ? new Date(`${deadline}T23:59:59`).getTime() : undefined,
      estimatedEffort: template.defaultEffort,
    });
    reset();
    onClose();
  };

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
          onChange={(e) => {
            setTitle(e.target.value);
            setTypeOverride(null);
          }}
          placeholder="What needs doing?"
          aria-label="Task"
          className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3.5 text-base outline-none placeholder:text-ink-3 focus:border-accent"
        />

        <div className="mt-3">
          <label htmlFor="task-type" className="mb-2 block text-sm text-ink-2">
            Breakdown
            {title.trim() && !typeOverride && match.confidence > 0 && (
              <span className="text-ink-3"> · matched</span>
            )}
          </label>
          <select
            id="task-type"
            value={type}
            onChange={(e) => setTypeOverride(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent"
          >
            {ALL_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key} className="bg-surface-2">
                {t.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-ink-3">
            {template.steps.length} steps ready · about {template.defaultEffort} min of work
          </p>
        </div>

        <Chips label="Urgency" options={URGENCIES} value={urgency} onChange={setUrgency} />
        <Chips label="Weight" options={WEIGHTS} value={priority} onChange={setPriority} />

        <div className="mt-4">
          <label htmlFor="task-deadline" className="mb-2 block text-sm text-ink-2">
            Deadline <span className="text-ink-3">· optional</span>
          </label>
          <input
            id="task-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <button
          type="submit"
          disabled={!title.trim()}
          className="mt-6 w-full rounded-2xl bg-accent py-4 text-base font-semibold text-white disabled:opacity-40"
        >
          Add task
        </button>
      </form>
    </Sheet>
  );
}
