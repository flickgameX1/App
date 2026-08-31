import type { Priority, SprintStatus, StatsLog, Task } from '../db/types';

/**
 * XP is weighted by difficulty (task priority), length (focused minutes) and
 * execution (how the sprint ended). Crucially, an abandoned sprint still pays:
 * showing up is the behaviour worth reinforcing, so nothing here can score zero.
 */
const DIFFICULTY: Record<Priority, number> = { 1: 1, 2: 1.15, 3: 1.35 };

const EXECUTION: Record<Exclude<SprintStatus, 'running'>, number> = {
  completed: 1,
  paused: 0.8,
  scrapped: 0.5,
};

export function sprintXp(
  focusMinutes: number,
  priority: Priority,
  status: Exclude<SprintStatus, 'running'>,
): number {
  const raw = focusMinutes * 0.6 * DIFFICULTY[priority] * EXECUTION[status];
  return Math.max(1, Math.round(raw));
}

/** Bonus for finishing the whole task, scaled by how big it was. */
export function taskXp(task: Pick<Task, 'priority' | 'estimatedEffort'>): number {
  const size = Math.min(task.estimatedEffort, 240) / 6;
  return Math.round((20 + size) * DIFFICULTY[task.priority]);
}

/** Levels widen as they go, so early progress is visible and later levels earn. */
export function levelFor(totalXp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, totalXp) / 40)) + 1;
}

export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 40;
}

export function levelProgress(totalXp: number): { level: number; into: number; span: number; pct: number } {
  const level = levelFor(totalXp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const span = ceiling - floor;
  const into = totalXp - floor;
  return { level, into, span, pct: span ? into / span : 0 };
}

/**
 * A day counts if you showed up — any focused time at all, however the sprint
 * ended. Requiring a *finished* sprint would make stopping early a failure,
 * which is the one thing the sprint loop promises it is not.
 */
export function isActiveDay(log: StatsLog | undefined): boolean {
  if (!log) return false;
  return log.focusMinutes > 0 || log.sprintsCompleted > 0 || log.tasksCompleted > 0;
}

/**
 * The anti-streak. A rolling count of active days in a window: miss a day and it
 * dips by one, it never resets to zero. Deliberately not a "don't break the
 * chain" counter — one bad week should not erase months.
 */
export function consistency(logs: StatsLog[], windowDays: number, days: string[]): {
  activeDays: number;
  windowDays: number;
  score: number;
} {
  const active = new Set(logs.filter(isActiveDay).map((l) => l.date));
  const activeDays = days.filter((d) => active.has(d)).length;
  return { activeDays, windowDays, score: Math.round((activeDays / windowDays) * 100) };
}
