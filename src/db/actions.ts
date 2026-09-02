import { db } from './db';
import type { CognitiveLoad, Priority, SprintStatus, Task } from './types';
import { matchTemplate } from '../lib/matching';
import { rememberBreakdown, resolveStepTexts } from '../lib/breakdowns';
import { sprintsNeeded, timeBucketFor } from '../lib/buckets';
import { sprintAward, taskXp } from '../lib/xp';
import { focusedMinutes } from '../lib/sprintClock';
import { activeDaysIn } from '../lib/consistency';
import { dayKey, lastNDays } from '../lib/time';

export interface NewTaskInput {
  title: string;
  /** Breakdown template key. Falls back to fuzzy-matching the title. */
  type?: string;
  priority: Priority;
  cognitiveLoad: CognitiveLoad;
  estimatedMinutes: number;
  sprintLength: number;
  deadline?: number;
}

/**
 * Creates the task and attaches its breakdown as selectable steps. The steps are
 * rows from the start, in order but not sequenced — nothing here decides which
 * one has to be done first.
 */
export async function createTask(input: NewTaskInput): Promise<number> {
  const type = input.type ?? matchTemplate(input.title).template.key;
  const stepTexts = await resolveStepTexts(type);

  return db.transaction('rw', db.tasks, db.steps, async () => {
    const task: Task = {
      title: input.title.trim(),
      type,
      priority: input.priority,
      cognitiveLoad: input.cognitiveLoad,
      estimatedMinutes: input.estimatedMinutes,
      timeBucket: timeBucketFor(input.estimatedMinutes),
      sprintLength: input.sprintLength,
      deadline: input.deadline,
      status: 'active',
      createdAt: Date.now(),
    };
    const taskId = (await db.tasks.add(task)) as number;
    await db.steps.bulkAdd(
      stepTexts.map((text, order) => ({ taskId, text, done: false, order })),
    );
    return taskId;
  });
}

export async function deleteTask(taskId: number): Promise<void> {
  await db.transaction('rw', db.tasks, db.steps, db.sprints, async () => {
    await db.steps.where('taskId').equals(taskId).delete();
    await db.sprints.where('taskId').equals(taskId).delete();
    await db.tasks.delete(taskId);
  });
}

/**
 * Replace a task's steps and remember them as the user's version of the task
 * type. Order is renumbered from the list the user left behind.
 */
export async function saveSteps(taskId: number, texts: string[]): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) return;
  const cleaned = texts.map((t) => t.trim()).filter(Boolean);
  await db.transaction('rw', db.steps, async () => {
    const existing = await db.steps.where('taskId').equals(taskId).sortBy('order');
    // Keep the done flags of steps whose text survived the edit.
    const doneByText = new Map(existing.filter((s) => s.done).map((s) => [s.text, true]));
    await db.steps.where('taskId').equals(taskId).delete();
    await db.steps.bulkAdd(
      cleaned.map((text, order) => ({ taskId, text, order, done: doneByText.get(text) ?? false })),
    );
  });
  await rememberBreakdown(task.type, cleaned);
}

// ─── Sprints ────────────────────────────────────────────────────────────────

/**
 * Rolls today's log forward and keeps the running totals in step. Every ending
 * comes through here, so "log completion" is one place rather than three.
 */
async function logActivity(delta: {
  sprintsCompleted?: number;
  tasksCompleted?: number;
  xpEarned?: number;
}): Promise<void> {
  const date = dayKey();
  const existing = await db.statsLogs.get(date);
  await db.statsLogs.put({
    date,
    sprintsCompleted: (existing?.sprintsCompleted ?? 0) + (delta.sprintsCompleted ?? 0),
    tasksCompleted: (existing?.tasksCompleted ?? 0) + (delta.tasksCompleted ?? 0),
    xpEarned: (existing?.xpEarned ?? 0) + (delta.xpEarned ?? 0),
    consistencyWindow: 0,
  });

  // Recomputed after the write so today counts itself.
  const window = lastNDays(7);
  const logs = await db.statsLogs.where('date').anyOf(window).toArray();
  await db.statsLogs.update(date, { consistencyWindow: activeDaysIn(logs, window) });

  const progress = await db.progress.get(1);
  if (progress) {
    // The daily quest resets nightly, so a count from an earlier day starts over.
    const sameDay = progress.dailyQuestDate === date;
    await db.progress.update(1, {
      totalXp: progress.totalXp + (delta.xpEarned ?? 0),
      lastActiveDate: date,
      dailyQuestDate: date,
      dailyQuestDone: (sameDay ? progress.dailyQuestDone : 0) + (delta.sprintsCompleted ?? 0),
    });
  }
}

export async function startSprint(
  taskId: number,
  goalText: string,
  stepIds: number[],
  plannedLength: number,
): Promise<number> {
  // One sprint at a time. A sprint left running by another tab or an interrupted
  // session is closed out as stopped rather than orphaned — it still pays for
  // the time it holds, so closing it loses nothing.
  const orphans = await db.sprints.where('status').equals('running').toArray();
  for (const orphan of orphans) {
    if (orphan.id !== undefined) await endSprint(orphan.id, 'stopped');
  }

  return db.sprints.add({
    taskId,
    goalText: goalText.trim(),
    stepIds,
    plannedLength,
    actualLength: 0,
    status: 'running',
    startedAt: Date.now(),
    pausedMs: 0,
    xpAwarded: 0,
  }) as Promise<number>;
}

export async function pauseSprint(sprintId: number): Promise<void> {
  const sprint = await db.sprints.get(sprintId);
  if (!sprint || sprint.pausedAt) return;
  await db.sprints.update(sprintId, { pausedAt: Date.now() });
}

export async function resumeSprint(sprintId: number): Promise<void> {
  const sprint = await db.sprints.get(sprintId);
  if (!sprint?.pausedAt) return;
  await db.sprints.update(sprintId, {
    pausedMs: sprint.pausedMs + (Date.now() - sprint.pausedAt),
    pausedAt: undefined,
  });
}

export interface SprintOutcome {
  xpAwarded: number;
  focusedMinutes: number;
}

/**
 * Ends a sprint. 'completed' is the timer running out or the goal being called
 * done; 'paused' is "resume later"; 'stopped' is "done for now". None of the
 * three is a failure and all three pay for the time spent.
 */
export async function endSprint(
  sprintId: number,
  status: Exclude<SprintStatus, 'running'>,
): Promise<SprintOutcome> {
  const sprint = await db.sprints.get(sprintId);
  if (!sprint || sprint.status !== 'running') return { xpAwarded: 0, focusedMinutes: 0 };

  const endedAt = Date.now();
  const minutes = focusedMinutes({ ...sprint, endedAt }, endedAt);
  const task = await db.tasks.get(sprint.taskId);
  if (!task) return { xpAwarded: 0, focusedMinutes: minutes };

  const siblings = await db.sprints.where('taskId').equals(sprint.taskId).toArray();
  const alreadyAwarded = siblings.reduce((sum, s) => sum + (s.id === sprintId ? 0 : s.xpAwarded), 0);

  const xpAwarded = sprintAward({
    totalXp: taskXp(task),
    sprintsPlanned: sprintsNeeded(task.estimatedMinutes, task.sprintLength),
    alreadyAwarded,
    focusedMinutes: minutes,
    plannedLength: sprint.plannedLength,
    finished: status === 'completed',
  });

  await db.sprints.update(sprintId, {
    status,
    endedAt,
    actualLength: minutes,
    xpAwarded,
    pausedAt: undefined,
  });
  await logActivity({ sprintsCompleted: status === 'completed' ? 1 : 0, xpEarned: xpAwarded });

  return { xpAwarded, focusedMinutes: minutes };
}

/** Marks the steps a sprint was for as done. Only ever called when asked to. */
export async function markGoalDone(sprintId: number): Promise<void> {
  const sprint = await db.sprints.get(sprintId);
  if (!sprint?.stepIds?.length) return;
  await db.steps.where('id').anyOf(sprint.stepIds).modify({ done: true });
}

/**
 * Finishing the task pays out whatever the sprints left on the table, so the
 * total earned always lands exactly on what the task was worth.
 */
export async function completeTask(taskId: number): Promise<number> {
  const task = await db.tasks.get(taskId);
  if (!task || task.status === 'done') return 0;
  const sprints = await db.sprints.where('taskId').equals(taskId).toArray();
  const awarded = sprints.reduce((sum, s) => sum + s.xpAwarded, 0);
  const remainder = Math.max(0, taskXp(task) - awarded);

  await db.tasks.update(taskId, { status: 'done', completedAt: Date.now() });
  await logActivity({ tasksCompleted: 1, xpEarned: remainder });
  return remainder;
}
