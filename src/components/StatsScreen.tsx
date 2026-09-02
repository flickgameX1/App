import { useMemo, useState } from 'react';
import type { Progress, Sprint, StatsLog, Task } from '../db/types';
import GrowthChart from './charts/GrowthChart';
import LoadBars from './charts/LoadBars';
import { cumulativeXp, totals, xpByLoad } from '../lib/stats';
import { activeDaysIn, isActiveDay } from '../lib/consistency';
import { levelProgress } from '../lib/levels';
import { formatDuration, lastNDays } from '../lib/time';

const WINDOW = 30;
const CONSISTENCY_WINDOW = 7;

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-xl border border-line bg-surface p-3">
      <p className="text-xs text-dim">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function StatsScreen({
  logs,
  tasks,
  sprints,
  progress,
}: {
  logs: StatsLog[];
  tasks: Task[];
  sprints: Sprint[];
  progress: Progress | undefined;
}) {
  const [showTable, setShowTable] = useState(false);

  const days = useMemo(() => lastNDays(WINDOW), []);
  const week = days.slice(-CONSISTENCY_WINDOW);
  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);

  const totalXp = progress?.totalXp ?? 0;
  const { level, title } = levelProgress(totalXp);
  const growth = useMemo(() => cumulativeXp(logs, days, totalXp), [logs, days, totalXp]);
  const slices = useMemo(() => xpByLoad(tasks, sprints), [tasks, sprints]);
  const counted = useMemo(() => totals(tasks, sprints), [tasks, sprints]);
  const activeDays = activeDaysIn(logs, week);

  return (
    <div className="pt-safe pb-8">
      <header className="px-5">
        <h1 className="text-sm text-dim">Stats</h1>
        <p className="mt-2 font-display text-5xl font-semibold tabular-nums">{totalXp.toLocaleString()}</p>
        <p className="mt-1 text-sm text-muted">
          XP · level {level} <span className="text-dim">· {title}</span>
        </p>
      </header>

      <section className="mt-6 px-5" aria-labelledby="consistency-heading">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 id="consistency-heading" className="text-xs text-dim">
            Consistency
          </h2>
          <p className="mt-1 font-display text-lg font-semibold">
            Active {activeDays} of the last {CONSISTENCY_WINDOW} days
          </p>
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {week.map((date) => (
              <span
                key={date}
                className={`h-2 flex-1 rounded-full ${isActiveDay(byDate.get(date)) ? 'bg-accent' : 'bg-line'}`}
              />
            ))}
          </div>
          <p className="mt-2.5 text-xs text-dim">
            A rolling count, not a streak. Miss a day and it dips by one — it never goes back to zero.
          </p>
        </div>
      </section>

      <div className="mt-3 flex gap-3 px-5">
        <Tile label="Tasks done" value={String(counted.tasksCompleted)} />
        <Tile label="Sprints" value={String(counted.sprintsCompleted)} />
        <Tile label="Focused" value={formatDuration(counted.focusMinutes)} />
      </div>

      <section className="mt-8 px-5" aria-labelledby="growth-heading">
        <h2 id="growth-heading" className="text-sm text-muted">
          Total XP
        </h2>
        <p className="mb-2 text-xs text-dim">Last {WINDOW} days</p>
        <GrowthChart data={growth} />
      </section>

      <section className="mt-8 px-5" aria-labelledby="load-heading">
        <h2 id="load-heading" className="text-sm text-muted">
          XP by how hard it was
        </h2>
        <p className="mb-3 text-xs text-dim">Across every task, finished or not</p>
        <LoadBars slices={slices} />
      </section>

      <div className="mt-8 px-5">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="text-sm text-accent"
        >
          {showTable ? 'Hide numbers' : 'Show numbers'}
        </button>
        {showTable && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm tabular-nums">
              <thead className="text-xs text-dim">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Day</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Sprints</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Tasks</th>
                  <th scope="col" className="py-2 font-medium">XP</th>
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().map((date) => {
                  const log = byDate.get(date);
                  return (
                    <tr key={date} className="border-t border-line/70">
                      <td className="py-2 pr-3 text-muted">{date.slice(5)}</td>
                      <td className="py-2 pr-3">{log?.sprintsCompleted ?? 0}</td>
                      <td className="py-2 pr-3">{log?.tasksCompleted ?? 0}</td>
                      <td className="py-2">{log?.xpEarned ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
