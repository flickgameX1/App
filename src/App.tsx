import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import type { Step, Task } from './db/types';
import {
  completeTask,
  createTask,
  endSprint,
  pauseSprint,
  resumeSprint,
  saveBreakdown,
  setStepDone,
  startSprint,
  type NewTaskInput,
} from './db/actions';
import TabBar, { type Screen } from './components/TabBar';
import NowScreen from './components/NowScreen';
import PlanScreen from './components/PlanScreen';
import StatsScreen from './components/StatsScreen';
import SprintScreen, { type StopChoice } from './components/SprintScreen';
import { SprintDoneSheet, StopSheet } from './components/SprintSheets';
import TaskPicker from './components/TaskPicker';
import AddTaskSheet from './components/AddTaskSheet';
import { horizonOrder } from './lib/horizon';
import { suggestSprintLength } from './lib/sprint';

const CURRENT_TASK_KEY = 'sprint:current-task';

export default function App() {
  const [screen, setScreen] = useState<Screen>('now');
  const [pickedId, setPickedId] = useState<number | null>(() => {
    const stored = localStorage.getItem(CURRENT_TASK_KEY);
    return stored ? Number(stored) : null;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [lastLength, setLastLength] = useState(25);
  const [finished, setFinished] = useState<{ xp: number; minutes: number } | null>(null);

  const activeTasks = useLiveQuery(() => db.tasks.where('status').equals('active').toArray(), [], []);
  const doneTasks = useLiveQuery(
    () => db.tasks.where('status').equals('done').reverse().sortBy('completedAt'),
    [],
    [],
  );
  const running = useLiveQuery(() => db.sprints.where('status').equals('running').first(), []);
  const logs = useLiveQuery(() => db.statsLogs.toArray(), [], []);
  const personalTypes = useLiveQuery(
    async () => (await db.breakdowns.toArray()).map((b) => b.taskType),
    [],
    [] as string[],
  );

  // Whatever you last picked stays picked; otherwise fall back to the nearest
  // thing on the horizon, so opening the app never lands on a dead end.
  const currentTask = useMemo<Task | null>(() => {
    const picked = activeTasks.find((t) => t.id === pickedId);
    return picked ?? horizonOrder(activeTasks)[0] ?? null;
  }, [activeTasks, pickedId]);

  useEffect(() => {
    if (currentTask?.id) localStorage.setItem(CURRENT_TASK_KEY, String(currentTask.id));
    else localStorage.removeItem(CURRENT_TASK_KEY);
  }, [currentTask?.id]);

  const runningTask = useMemo(
    () => (running ? activeTasks.find((t) => t.id === running.taskId) ?? null : null),
    [running, activeTasks],
  );

  const pick = (task: Task) => {
    setPickedId(task.id ?? null);
    setPickerOpen(false);
    setScreen('now');
  };

  const add = async (input: NewTaskInput) => {
    const id = await createTask(input);
    setPickedId(id);
    setScreen('now');
  };

  const begin = async (minutes: number) => {
    if (!currentTask?.id) return;
    setLastLength(minutes);
    await startSprint(currentTask.id, minutes);
  };

  const finish = useCallback(
    async (status: 'completed' | 'paused' | 'scrapped') => {
      if (!running?.id) return 0;
      const minutes = Math.min(running.plannedLength, Math.round(running.actualLength || 0));
      const xp = await endSprint(running.id, status);
      const sprint = await db.sprints.get(running.id);
      setFinished({ xp, minutes: sprint?.actualLength ?? minutes });
      return xp;
    },
    [running],
  );

  const onElapsed = useCallback(async () => {
    navigator.vibrate?.([120, 60, 120]);
    await finish('completed');
  }, [finish]);

  const onStopChoice = async (choice: StopChoice) => {
    setStopOpen(false);
    if (choice === 'task-done') {
      const taskId = running?.taskId;
      await finish('completed');
      if (taskId) await completeTask(taskId);
      setFinished(null);
      return;
    }
    await finish(choice);
    // Stopping deliberately is its own full stop — no "well done" sheet on top.
    setFinished(null);
  };

  if (running && runningTask) {
    return (
      <>
        <SprintScreen
          sprint={running}
          task={runningTask}
          onPause={() => running.id && pauseSprint(running.id)}
          onResume={() => running.id && resumeSprint(running.id)}
          onToggleStep={(stepId, done) => runningTask.id && setStepDone(runningTask.id, stepId, done)}
          onStop={() => setStopOpen(true)}
          onElapsed={onElapsed}
        />
        <StopSheet open={stopOpen} onClose={() => setStopOpen(false)} onChoose={onStopChoice} />
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1">
        {screen === 'now' && (
          <NowScreen
            tasks={activeTasks}
            currentTask={currentTask}
            personalised={Boolean(currentTask && personalTypes.includes(currentTask.type))}
            onStart={begin}
            onToggleStep={(stepId, done) => currentTask?.id && setStepDone(currentTask.id, stepId, done)}
            onSaveSteps={(steps: Step[]) => currentTask?.id && saveBreakdown(currentTask.id, steps)}
            onComplete={async () => {
              if (currentTask?.id) await completeTask(currentTask.id);
              setPickedId(null);
            }}
            onPickTask={pick}
            onOpenPicker={() => setPickerOpen(true)}
            onOpenAdd={() => setAddOpen(true)}
            onQuickAdd={(title) => add({ title })}
            onOpenPlan={() => setScreen('plan')}
          />
        )}
        {screen === 'plan' && (
          <PlanScreen
            tasks={activeTasks}
            done={doneTasks}
            onPick={pick}
            onComplete={(task) => task.id && completeTask(task.id)}
          />
        )}
        {screen === 'stats' && (
          <StatsScreen logs={logs} tasksCompleted={doneTasks.length} />
        )}
      </main>

      <TabBar screen={screen} onChange={setScreen} />

      <TaskPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        tasks={activeTasks}
        onPick={pick}
        onNew={() => {
          setPickerOpen(false);
          setAddOpen(true);
        }}
      />
      <AddTaskSheet open={addOpen} onClose={() => setAddOpen(false)} onAdd={add} />
      <SprintDoneSheet
        open={finished !== null}
        xp={finished?.xp ?? 0}
        focusMinutes={finished?.minutes ?? 0}
        onAnother={async () => {
          setFinished(null);
          const task = currentTask;
          if (task?.id) await startSprint(task.id, suggestSprintLength(task) || lastLength);
        }}
        onTaskDone={async () => {
          setFinished(null);
          if (currentTask?.id) await completeTask(currentTask.id);
          setPickedId(null);
        }}
        onClose={() => setFinished(null)}
      />
    </div>
  );
}
