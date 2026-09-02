import type { StatsLog } from '../db/types';

/**
 * A day counts if you showed up — any focused time at all, however the sprint
 * ended. Requiring a *finished* sprint would quietly make stopping early a
 * failure, which is the one thing the loop promises it is not.
 */
export function isActiveDay(log: StatsLog | undefined): boolean {
  if (!log) return false;
  return log.sprintsCompleted > 0 || log.tasksCompleted > 0 || log.xpEarned > 0;
}

/**
 * The anti-streak: active days inside a rolling window. Missing a day costs one
 * day, never the whole history, so nothing here can drop to zero in one step.
 */
export function activeDaysIn(logs: StatsLog[], days: string[]): number {
  const active = new Set(logs.filter(isActiveDay).map((l) => l.date));
  return days.filter((d) => active.has(d)).length;
}
