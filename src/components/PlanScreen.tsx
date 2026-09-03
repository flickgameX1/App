import { useMemo, useState } from 'react';
import type { Priority, Task } from '../db/types';
import CalendarGrid from './CalendarGrid';
import PaceBlock from './PaceBlock';
import { PRIORITY_META } from './meta';
import { addMonths, cursorFor, monthGrid, monthLabel, weekOf, type MonthCursor } from '../lib/calendar';
import { sortForList } from '../lib/ordering';
import { paceFor } from '../lib/pace';
import { sprintsNeeded } from '../lib/buckets';
import { dayKey, formatDuration } from '../lib/time';

export default function PlanScreen({
  tasks,
  sprintsDone,
  onOpen,
}: {
  tasks: Task[];
  sprintsDone: Map<number, number>;
  onOpen: (task: Task) => void;
}) {
  const today = dayKey();
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState<MonthCursor>(() => cursorFor(today));
  // Week view is here for anyone who finds the month grid too wide to read.
  const [view, setView] = useState<'month' | 'week'>('month');

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (task.deadline === undefined) continue;
      const key = dayKey(task.deadline);
      map.set(key, [...(map.get(key) ?? []), task]);
    }
    return map;
  }, [tasks]);

  const weeks = view === 'month' ? monthGrid(cursor) : [weekOf(selected)];
  const agenda = sortForList(byDay.get(selected) ?? []);
  const undated = tasks.filter((t) => t.deadline === undefined);

  const paces = useMemo(
    () =>
      tasks
        .map((task) => ({ task, pace: paceFor(task, sprintsDone.get(task.id!) ?? 0) }))
        .filter((p): p is { task: Task; pace: NonNullable<typeof p.pace> } => p.pace !== null)
        .sort((a, b) => a.task.deadline! - b.task.deadline!),
    [tasks, sprintsDone],
  );

  const dotsFor = (date: string): Priority[] =>
    sortForList(byDay.get(date) ?? []).map((t) => t.priority);

  return (
    <div className="pt-safe pb-8">
      <header className="mb-3 flex items-center justify-between gap-2 px-5">
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, -1))}
            aria-label="Previous month"
            className="-ml-2 h-9 w-8 shrink-0 rounded-lg text-muted"
          >
            ‹
          </button>
          <h1 className="font-display text-base font-semibold tracking-tight whitespace-nowrap">
            {monthLabel(cursor)}
          </h1>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
            className="h-9 w-8 shrink-0 rounded-lg text-muted"
          >
            ›
          </button>
        </div>
        <div className="flex shrink-0 rounded-lg border border-line p-0.5 text-xs">
          {(['month', 'week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-md px-2.5 py-1 ${view === v ? 'bg-surface text-text' : 'text-dim'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      <CalendarGrid
        weeks={weeks}
        cursor={view === 'month' ? cursor : null}
        selected={selected}
        today={today}
        dotsFor={dotsFor}
        onSelect={(date) => {
          setSelected(date);
          setCursor(cursorFor(date));
        }}
      />

      <section className="mt-6 px-5" aria-labelledby="agenda-heading">
        <h2 id="agenda-heading" className="text-sm text-muted">
          {selected === today ? 'Today' : new Date(selected).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        {agenda.length === 0 ? (
          <p className="mt-2 text-sm text-dim">
            Nothing due.
            {undated.length > 0 && ` ${undated.length} ${undated.length === 1 ? 'task has' : 'tasks have'} no date.`}
          </p>
        ) : (
          <ul className="mt-2">
            {agenda.map((task) => {
              const planned = sprintsNeeded(task.estimatedMinutes, task.sprintLength);
              const left = Math.max(0, planned - (sprintsDone.get(task.id!) ?? 0));
              return (
                <li key={task.id} className="relative border-b border-line/70 last:border-0">
                  <span
                    aria-hidden="true"
                    className={`absolute top-3 bottom-3 left-0 w-[3px] rounded-full ${PRIORITY_META[task.priority].bar}`}
                  />
                  <button type="button" onClick={() => onOpen(task)} className="w-full py-3 pl-4 text-left">
                    <span className="block text-sm">{task.title}</span>
                    <span className="mt-0.5 block text-xs text-dim">
                      {left} {left === 1 ? 'sprint' : 'sprints'} left · {formatDuration(task.estimatedMinutes)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {paces.length > 0 && (
        <section className="mt-7 px-5" aria-labelledby="pace-heading">
          <h2 id="pace-heading" className="text-sm text-muted">
            Pace
          </h2>
          <p className="mb-1 text-xs text-dim">What it takes from here</p>
          <ul>
            {paces.map(({ task, pace }) => (
              <PaceBlock key={task.id} task={task} pace={pace} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
