import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { ensureSeeded } from './db/seed';
import { createTask, deleteTask, saveSteps, type NewTaskInput } from './db/actions';
import { usePalette } from './lib/usePalette';
import NowScreen from './components/NowScreen';
import NewTaskSheet from './components/NewTaskSheet';
import FocusView from './components/FocusView';
import { lastNDays } from './lib/time';

type TabId = 'now' | 'plan' | 'stats';

const TABS: { id: TabId; label: string; waitingFor?: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'plan', label: 'Plan', waitingFor: 'Calendar — stage 6' },
  { id: 'stats', label: 'Stats', waitingFor: 'Stats — stage 5' },
];

export default function App() {
  const [tab, setTab] = useState<TabId>('now');
  const [adding, setAdding] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const settings = useLiveQuery(() => db.settings.get(1));
  const tasks = useLiveQuery(() => db.tasks.where('status').equals('active').toArray(), [], []);
  const completedSprints = useLiveQuery(
    () => db.sprints.where('status').equals('completed').toArray(),
    [],
    [],
  );
  const openSteps = useLiveQuery(
    () => (openTaskId === null ? [] : db.steps.where('taskId').equals(openTaskId).sortBy('order')),
    [openTaskId],
    [],
  );
  const statsLogs = useLiveQuery(() => db.statsLogs.toArray(), [], []);

  useEffect(() => {
    void ensureSeeded();
  }, []);

  usePalette(settings?.activePaletteId);

  const sprintsDone = useMemo(() => {
    const counts = new Map<number, number>();
    for (const sprint of completedSprints) {
      counts.set(sprint.taskId, (counts.get(sprint.taskId) ?? 0) + 1);
    }
    return counts;
  }, [completedSprints]);

  /** Daily XP for the focus view's sparkline. Empty days are real zeroes. */
  const recentXp = useMemo(() => {
    const byDate = new Map(statsLogs.map((l) => [l.date, l.xpEarned]));
    return lastNDays(14).map((date) => byDate.get(date) ?? 0);
  }, [statsLogs]);

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;
  const placeholder = TABS.find((t) => t.id === tab)?.waitingFor;

  // The focus view takes the whole screen: no list, no tabs, nothing else.
  if (openTask) {
    return (
      <div className="mx-auto h-full max-w-md">
        <FocusView
          task={openTask}
          steps={openSteps}
          sprintsDone={sprintsDone.get(openTask.id!) ?? 0}
          recentXp={recentXp}
          onBack={() => setOpenTaskId(null)}
          onSaveSteps={(texts) => void saveSteps(openTask.id!, texts)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="flex flex-1 flex-col overflow-y-auto">
        {tab === 'now' ? (
          <NowScreen
            tasks={tasks}
            sprintsDone={sprintsDone}
            onNewTask={() => setAdding(true)}
            onOpen={(task) => setOpenTaskId(task.id ?? null)}
            onDelete={(task) => task.id && deleteTask(task.id)}
          />
        ) : (
          <div className="flex flex-1 flex-col px-5 pt-safe">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {TABS.find((t) => t.id === tab)?.label}
            </h1>
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-dim">{placeholder}</p>
            </div>
          </div>
        )}
      </main>

      <nav className="border-t border-line pb-safe">
        <ul className="flex">
          {TABS.map((t) => {
            const current = t.id === tab;
            return (
              <li key={t.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={current ? 'page' : undefined}
                  className={`w-full py-3 text-sm font-medium ${current ? 'text-text' : 'text-dim'}`}
                >
                  <span className="relative inline-block">
                    {t.label}
                    <span
                      className={`absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                        current ? 'bg-accent' : 'bg-transparent'
                      }`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <NewTaskSheet
        open={adding}
        onClose={() => setAdding(false)}
        defaultSprintLength={settings?.defaultSprintLength ?? 25}
        onAdd={(input: NewTaskInput) => void createTask(input)}
      />
    </div>
  );
}
