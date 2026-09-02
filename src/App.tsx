import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { ensureSeeded } from './db/seed';
import {
  completeTask,
  createTask,
  deleteTask,
  endSprint,
  markGoalDone,
  pauseSprint,
  resumeSprint,
  saveSteps,
  setPalette,
  startSprint,
  type NewTaskInput,
} from './db/actions';
import { usePalette } from './lib/usePalette';
import { DEFAULT_PALETTE_ID } from './lib/palettes';
import NowScreen from './components/NowScreen';
import NewTaskSheet from './components/NewTaskSheet';
import FocusView from './components/FocusView';
import ActiveSprint from './components/ActiveSprint';
import StatsScreen from './components/StatsScreen';
import PlanScreen from './components/PlanScreen';
import PaletteSheet from './components/PaletteSheet';
import StopSheet from './components/StopSheet';
import SprintDone, { type SprintResult } from './components/SprintDone';
import { dayKey, lastNDays } from './lib/time';
import { momentumFrom } from './lib/momentum';

type TabId = 'now' | 'plan' | 'stats';

const TABS: { id: TabId; label: string; waitingFor?: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'plan', label: 'Plan' },
  { id: 'stats', label: 'Stats' },
];

export default function App() {
  const [tab, setTab] = useState<TabId>('now');
  const [adding, setAdding] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [stopping, setStopping] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [result, setResult] = useState<SprintResult | null>(null);

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
  const running = useLiveQuery(() => db.sprints.where('status').equals('running').first(), []);
  const progress = useLiveQuery(() => db.progress.get(1), []);
  // Stats spans finished work too, so it reads every task and every sprint.
  const allTasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const allSprints = useLiveQuery(() => db.sprints.toArray(), [], []);

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

  // Momentum is derived from the log rather than read from the stored counter,
  // so days missed while the app was closed are already accounted for.
  const today = dayKey();
  const momentum = useMemo(() => momentumFrom(statsLogs, today), [statsLogs, today]);

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;
  const runningTask = running ? (tasks.find((t) => t.id === running.taskId) ?? null) : null;

  /** Every ending routes through here so the payoff screen is the one exit. */
  const finish = async (status: 'completed' | 'paused' | 'stopped', goalAlreadyDone = false) => {
    if (!running?.id) return;
    const steps = await db.steps.where('taskId').equals(running.taskId).count();
    const outcome = await endSprint(running.id, status);
    if (goalAlreadyDone) await markGoalDone(running.id);
    setResult({
      sprintId: running.id,
      status,
      xpAwarded: outcome.xpAwarded,
      focusedMinutes: outcome.focusedMinutes,
      goalText: running.goalText,
      goalAlreadyDone,
      hasSteps: steps > 0 && (running.stepIds?.length ?? 0) > 0,
      newBadges: outcome.newBadges,
    });
    setOpenTaskId(running.taskId);
  };

  // A finished sprint owns the screen until it's dismissed.
  if (result) {
    return (
      <div className="mx-auto h-full max-w-md">
        <SprintDone
          result={result}
          onGoalDone={() => void markGoalDone(result.sprintId)}
          onAnother={async () => {
            const task = tasks.find((t) => t.id === openTaskId);
            setResult(null);
            if (task?.id) await startSprint(task.id, result.goalText, [], task.sprintLength);
          }}
          onTaskComplete={async () => {
            if (openTaskId === null) {
              setResult(null);
              return;
            }
            // Finishing the task pays the remainder and can earn milestones —
            // both belong in the reward moment, not discovered later on Stats.
            const outcome = await completeTask(openTaskId);
            setOpenTaskId(null);
            setResult({
              taskFinished: true,
              sprintId: result.sprintId,
              status: 'completed',
              xpAwarded: outcome.xpAwarded,
              focusedMinutes: 0,
              goalText: '',
              goalAlreadyDone: true,
              hasSteps: false,
              newBadges: outcome.newBadges,
            });
          }}
          onBack={() => setResult(null)}
        />
      </div>
    );
  }

  // A running sprint owns it too — no list, no tabs, no stats.
  if (running && runningTask) {
    return (
      <div className="mx-auto h-full max-w-md">
        <ActiveSprint
          sprint={running}
          taskTitle={runningTask.title}
          onPause={() => running.id && void pauseSprint(running.id)}
          onResume={() => running.id && void resumeSprint(running.id)}
          onGoalDone={() => void finish('completed', true)}
          onStop={() => setStopping(true)}
          onElapsed={() => {
            navigator.vibrate?.([120, 60, 120]);
            void finish('completed');
          }}
        />
        <StopSheet
          open={stopping}
          onClose={() => setStopping(false)}
          onChoose={(choice) => {
            setStopping(false);
            void finish(choice);
          }}
        />
      </div>
    );
  }
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
          onStart={(goalText, stepIds) =>
            void startSprint(openTask.id!, goalText, stepIds, openTask.sprintLength)
          }
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
            progress={progress}
            momentum={momentum}
            today={today}
            onNewTask={() => setAdding(true)}
            onOpen={(task) => setOpenTaskId(task.id ?? null)}
            onOpenPlan={() => setTab('plan')}
            onOpenTheme={() => setThemeOpen(true)}
            onDelete={(task) => task.id && deleteTask(task.id)}
          />
        ) : tab === 'plan' ? (
          <PlanScreen
            tasks={tasks}
            sprintsDone={sprintsDone}
            onOpen={(task) => setOpenTaskId(task.id ?? null)}
          />
        ) : tab === 'stats' ? (
          <StatsScreen logs={statsLogs} tasks={allTasks} sprints={allSprints} progress={progress} />
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

      <PaletteSheet
        open={themeOpen}
        active={settings?.activePaletteId ?? DEFAULT_PALETTE_ID}
        onClose={() => setThemeOpen(false)}
        onChoose={(id) => void setPalette(id)}
      />
      <NewTaskSheet
        open={adding}
        onClose={() => setAdding(false)}
        defaultSprintLength={settings?.defaultSprintLength ?? 25}
        onAdd={(input: NewTaskInput) => void createTask(input)}
      />
    </div>
  );
}
