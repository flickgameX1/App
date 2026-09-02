import type { CognitiveLoad, Task, TimeBucket } from '../db/types';

/**
 * XP has two independent axes, both fixed when the task is created:
 *
 *   time bucket    (derived from the typed duration) sets the base pool
 *   cognitive load (chosen by the user)              multiplies it
 *
 * Sprint count deliberately plays no part. Chunking a task into more sprints
 * must not inflate its worth, or the scoring quietly rewards padding rather
 * than finishing.
 */
export const TIME_BUCKET_XP: Record<TimeBucket, number> = {
  under30: 20,
  halfToHour: 45,
  oneToThree: 100,
  long: 220,
};

/**
 * "Impossible" is the tier for the thing that has been on the list for months.
 * It pays 2.5×, because the barrier there is not the hours — it's the starting.
 */
export const LOAD_MULTIPLIER: Record<CognitiveLoad, number> = {
  easy: 1,
  moderate: 1.4,
  challenging: 1.9,
  impossible: 2.5,
};

export const LOAD_LABELS: Record<CognitiveLoad, string> = {
  easy: 'easy',
  moderate: 'moderate',
  challenging: 'challenging',
  impossible: 'impossible',
};

/** What the whole task is worth, awarded on completion. */
export function taskXp(task: Pick<Task, 'timeBucket' | 'cognitiveLoad'>): number {
  return Math.round(TIME_BUCKET_XP[task.timeBucket] * LOAD_MULTIPLIER[task.cognitiveLoad]);
}

/**
 * Stopping a task part-way pays for the part that got done. Forfeiting the
 * remainder is the only cost — there is no path where work already put in
 * scores nothing.
 */
export function partialXp(
  task: Pick<Task, 'timeBucket' | 'cognitiveLoad'>,
  sprintsCompleted: number,
  sprintsPlanned: number,
): number {
  if (sprintsPlanned <= 0 || sprintsCompleted <= 0) return 0;
  const share = Math.min(1, sprintsCompleted / sprintsPlanned);
  return Math.round(taskXp(task) * share);
}
