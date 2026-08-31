import type { Priority, Task } from '../db/types';
import { templateByKey } from './templates';

export const MIN_SPRINT = 5;
export const MAX_SPRINT = 60;

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

/**
 * V1 sprint-length heuristic: the task type's default, nudged by how heavy the
 * task is and capped by how much work is actually left. Deliberately simple —
 * V2 replaces this with the pacing engine that works back from the deadline.
 * The suggestion is always editable; it is a starting point, not a rule.
 */
export function suggestSprintLength(task: Pick<Task, 'type' | 'priority' | 'estimatedEffort'>): number {
  const base = templateByKey(task.type).sprintLength;
  const byWeight: Record<Priority, number> = { 1: -5, 2: 0, 3: 5 };
  let length = base + byWeight[task.priority];
  // Never suggest a sprint longer than the work that is left.
  if (task.estimatedEffort > 0) length = Math.min(length, task.estimatedEffort);
  return Math.min(MAX_SPRINT, Math.max(MIN_SPRINT, roundTo5(length)));
}

/** Elapsed focus time in ms, with paused stretches taken out. */
export function focusedMs(
  sprint: { startedAt: number; pausedMs: number; pausedAt?: number; endedAt?: number },
  now: number = Date.now(),
): number {
  const end = sprint.endedAt ?? now;
  const pausedNow = sprint.pausedAt ? end - sprint.pausedAt : 0;
  return Math.max(0, end - sprint.startedAt - sprint.pausedMs - pausedNow);
}

export function remainingMs(
  sprint: { startedAt: number; plannedLength: number; pausedMs: number; pausedAt?: number },
  now: number = Date.now(),
): number {
  return sprint.plannedLength * 60_000 - focusedMs(sprint, now);
}
