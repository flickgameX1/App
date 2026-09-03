import type { Task } from '../db/types';
import { sprintsNeeded } from './buckets';
import { daysUntil } from './time';

/**
 * Pace is always stated as the target ahead — "2 sprints a day" — never as a
 * deficit behind. The number can rise as days run out; it never becomes a debt.
 */
export interface Pace {
  sprintsPerDay: number;
  daysLeft: number;
}

export function pacePlan(sprintsLeft: number, daysLeft: number | null): Pace | null {
  if (sprintsLeft <= 0 || daysLeft === null) return null;
  // A deadline today (or already past) still gets a plan: it's all for today.
  const days = Math.max(1, daysLeft);
  return { sprintsPerDay: Math.ceil(sprintsLeft / days), daysLeft: days };
}

export interface TaskPace {
  done: number;
  needed: number;
  left: number;
  daysLeft: number;
  /** Sprints a day that reaches the deadline from here. */
  perDay: number;
  /**
   * True when the rate needed now has risen above the rate the task started
   * with. It changes the framing to a revised target — never to a deficit.
   */
  behind: boolean;
}

export function paceFor(task: Task, sprintsDone: number, now: number = Date.now()): TaskPace | null {
  if (task.deadline === undefined) return null;
  const needed = sprintsNeeded(task.estimatedMinutes, task.sprintLength);
  const left = Math.max(0, needed - sprintsDone);
  if (left === 0) return null;

  const daysLeft = Math.max(1, daysUntil(task.deadline, now));
  const perDay = Math.ceil(left / daysLeft);

  // The rate the task implied on the day it was made, for comparison.
  const totalDays = Math.max(1, daysUntil(task.deadline, task.createdAt));
  const startingRate = Math.ceil(needed / totalDays);

  return { done: sprintsDone, needed, left, daysLeft, perDay, behind: perDay > startingRate };
}
