import { db } from './db';
import type { Priority, Sprint, SprintStatus, Step, Task, Urgency } from './types';
import { matchTemplate } from '../lib/matching';
import { resolveSteps, rememberBreakdown } from '../lib/breakdowns';
import { templateByKey } from '../lib/templates';
import { focusedMs } from '../lib/sprint';
import { sprintXp, taskXp } from '../lib/xp';
import { dayKey } from '../lib/time';

export interface NewTaskInput {
  title: string;
  type?: string;
  priority?: Priority;
  urgency?: Urgency;
  deadline?: number;
  estimatedEffort?: number;
}

export async function createTask(input: NewTaskInput): Promise<number> {
  const type = input.type ?? matchTemplate(input.title).template.key;
  const template = templateByKey(type);
  const task: Task = {
    title: input.title.trim(),
    type,
    priority: input.priority ?? 2,
    urgency: input.urgency ?? 2,
    deadline: input.deadline,
    estimatedEffort: input.estimatedEffort ?? template.defaultEffort,
    status: 'active',
    steps: await resolveSteps(type),
    createdAt: Date.now(),
  };
  return db.tasks.add(task) as Promise<number>;
}

export async function updateTask(id: number, changes: Partial<Task>): Promise<void> {
  await db.tasks.update(id, changes);
}

/** Ticking a step off is progress, not a template edit — it is never remembered. */
export async function setStepDone(taskId: number, stepId: string, done: boolean): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) return;
  const steps = task.steps.map((s) => (s.id === stepId ? { ...s, done } : s));
  await db.tasks.update(taskId, { steps });
}

/**
 * Save an edited breakdown against the task *and* against the task type, so the
 * user's version is what they are offered next time they do this kind of thing.
 */
export async function saveBreakdown(taskId: number, steps: Step[]): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) return;
  const cleaned = steps.filter((s) => s.text.trim().length > 0);
  await db.tasks.update(taskId, { steps: cleaned });
  await rememberBreakdown(task.type, cleaned);
}

export async function deleteTask(taskId: number): Promise<void> {
  await db.transaction('rw', db.tasks, db.sprints, async () => {
    await db.sprints.where('taskId').equals(taskId).delete();
    await db.tasks.delete(taskId);
  });
}

async function addToLog(
  date: string,
  delta: { tasksCompleted?: number; sprintsCompleted?: number; focusMinutes?: number; xpEarned?: number },
): Promise<void> {
  const existing = await db.statsLogs.get(date);
  await db.statsLogs.put({
    date,
    tasksCompleted: (existing?.tasksCompleted ?? 0) + (delta.tasksCompleted ?? 0),
    sprintsCompleted: (existing?.sprintsCompleted ?? 0) + (delta.sprintsCompleted ?? 0),
    focusMinutes: (existing?.focusMinutes ?? 0) + (delta.focusMinutes ?? 0),
    xpEarned: (existing?.xpEarned ?? 0) + (delta.xpEarned ?? 0),
  });
}

export async function startSprint(taskId: number, plannedLength: number): Promise<number> {
  const sprint: Sprint = {
    taskId,
    plannedLength,
    actualLength: 0,
    status: 'running',
    startedAt: Date.now(),
    pausedMs: 0,
    xpEarned: 0,
  };
  return db.sprints.add(sprint) as Promise<number>;
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

/**
 * End a sprint. `completed` is the timer running out, `paused` is "I'll come
 * back to this", `scrapped` is "done for now". None of them is a failure and all
 * three pay XP for the time actually spent.
 */
export async function endSprint(sprintId: number, status: Exclude<SprintStatus, 'running'>): Promise<number> {
  const sprint = await db.sprints.get(sprintId);
  if (!sprint || sprint.status !== 'running') return 0;
  const endedAt = Date.now();
  // Cap at the planned length: if the app was closed when the timer ran out, the
  // wall clock kept going but the sprint did not.
  const elapsed = focusedMs({ ...sprint, endedAt }, endedAt) / 60_000;
  const focusMinutes = Math.round(Math.min(sprint.plannedLength, elapsed) * 10) / 10;
  const task = await db.tasks.get(sprint.taskId);
  const xp = sprintXp(focusMinutes, task?.priority ?? 2, status);
  await db.sprints.update(sprintId, { status, endedAt, actualLength: focusMinutes, xpEarned: xp, pausedAt: undefined });
  await addToLog(dayKey(endedAt), {
    sprintsCompleted: status === 'completed' ? 1 : 0,
    focusMinutes,
    xpEarned: xp,
  });
  return xp;
}

export async function completeTask(taskId: number): Promise<number> {
  const task = await db.tasks.get(taskId);
  if (!task || task.status === 'done') return 0;
  const completedAt = Date.now();
  const xp = taskXp(task);
  await db.tasks.update(taskId, { status: 'done', completedAt });
  await addToLog(dayKey(completedAt), { tasksCompleted: 1, xpEarned: xp });
  return xp;
}

export async function reopenTask(taskId: number): Promise<void> {
  await db.tasks.update(taskId, { status: 'active', completedAt: undefined });
}
