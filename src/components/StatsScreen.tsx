import { useMemo, useState } from 'react';
import type { StatsLog } from '../db/types';
import TrendChart from './charts/TrendChart';
import BarChart from './charts/BarChart';
import type { Point } from './charts/scale';
import { consistency, isActiveDay, levelProgress } from '../lib/xp';
import { formatDuration, lastNDays } from '../lib/time';

const WINDOW = 14;
const CONSISTENCY_WINDOW = 7;

function shortLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export default function StatsScreen({ logs, tasksCompleted }: { logs: StatsLog[]; tasksCompleted: number }) {
  const [showTable, setShowTable] = useState(false);

  const days = useMemo(() => lastNDays(WINDOW), []);
  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);

  const xpSeries: Point[] = days.map((date) => ({
    date,
    label: shortLabel(date),
    value: byDate.get(date)?.xpEarned ?? 0,
  }));
  const focusSeries: Point[] = days.map((date) => ({
    date,
    label: shortLabel(date),
    value: Math.round(byDate.get(date)?.focusMinutes ?? 0),
  }));

  const totalXp = logs.reduce((sum, l) => sum + l.xpEarned, 0);
  const { level, into, span } = levelProgress(totalXp);
  const streakless = consistency(logs, CONSISTENCY_WINDOW, days.slice(-CONSISTENCY_WINDOW));
  const focusWeek = focusSeries.slice(-7).reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="pt-safe pb-8">
      <header className="px-5">
        <h1 className="text-sm font-medium text-ink-3">Stats</h1>
        <p className="mt-3 text-5xl font-semibold">{totalXp.toLocaleString()}</p>
        <p className="mt-1 text-sm text-ink-2">
          XP · level {level}
          <span className="text-ink-3">
            {' '}
            · {Math.max(0, span - into)} to level {level + 1}
          </span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-accent/20" role="presentation">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.round((span ? into / span : 0) * 100)}%` }}
          />
        </div>
      </header>

      <section className="mt-6 px-5" aria-label="Consistency">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs text-ink-3">Consistency</p>
          <p className="mt-1 text-xl font-semibold">
            Active {streakless.activeDays} of the last {streakless.windowDays} days
          </p>
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {days.slice(-CONSISTENCY_WINDOW).map((date) => {
              const active = isActiveDay(byDate.get(date));
              return (
                <span
                  key={date}
                  className={`h-2 flex-1 rounded-full ${active ? 'bg-accent' : 'bg-accent/20'}`}
                />
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            A rolling count, not a streak. Miss a day and it dips by one — it never goes back to zero.
          </p>
        </div>
      </section>

      <div className="mt-3 flex gap-3 px-5">
        <Tile label="Tasks done" value={String(tasksCompleted)} hint="all time" />
        <Tile label="Focus" value={formatDuration(focusWeek)} hint="last 7 days" />
      </div>

      <section className="mt-8 px-5" aria-labelledby="xp-trend">
        <h2 id="xp-trend" className="text-sm font-medium text-ink-2">
          XP earned per day
        </h2>
        <p className="mb-2 text-xs text-ink-3">Last {WINDOW} days</p>
        <TrendChart data={xpSeries} unit=" XP" />
      </section>

      <section className="mt-8 px-5" aria-labelledby="focus-trend">
        <h2 id="focus-trend" className="text-sm font-medium text-ink-2">
          Focused minutes per day
        </h2>
        <p className="mb-2 text-xs text-ink-3">Last {WINDOW} days</p>
        <BarChart data={focusSeries} unit=" min" />
      </section>

      <div className="mt-6 px-5">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="text-sm text-accent-ink"
        >
          {showTable ? 'Hide numbers' : 'Show numbers'}
        </button>
        {showTable && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm tabular-nums">
              <thead className="text-xs text-ink-3">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Day</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Sprints</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Focus</th>
                  <th scope="col" className="py-2 font-medium">XP</th>
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().map((date) => {
                  const log = byDate.get(date);
                  return (
                    <tr key={date} className="border-t border-line/60">
                      <td className="py-2 pr-3 text-ink-2">{shortLabel(date)}</td>
                      <td className="py-2 pr-3">{log?.sprintsCompleted ?? 0}</td>
                      <td className="py-2 pr-3">{Math.round(log?.focusMinutes ?? 0)}m</td>
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
