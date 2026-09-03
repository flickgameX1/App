import type { StatsLog } from '../db/types';
import { isActiveDay } from './consistency';
import { daysBetween } from './time';

/**
 * Momentum replaces the streak. An active day adds one; a missed day costs one.
 * Missing Tuesday costs a day, not the whole history — nothing here can be wiped
 * out in a single step, which is the entire point of not using a streak.
 *
 * Today is never counted as missed: the day is still in progress, and an app
 * that docks you at breakfast for not having started yet is an app you stop
 * opening.
 */
export function momentumFrom(logs: StatsLog[], today: string): number {
  const active = new Set(logs.filter(isActiveDay).map((l) => l.date));
  if (active.size === 0) return 0;

  const first = [...active].sort()[0];
  let momentum = 0;
  for (const day of daysBetween(first, today)) {
    if (active.has(day)) momentum += 1;
    else if (day !== today) momentum = Math.max(0, momentum - 1);
  }
  return momentum;
}

/**
 * The daily quest resets nightly, so a count left over from yesterday reads as
 * zero rather than as progress you haven't made today.
 */
export function questToday(
  progress: { dailyQuestDone: number; dailyQuestDate: string; dailyQuestTarget: number } | undefined,
  today: string,
): { done: number; target: number } {
  if (!progress) return { done: 0, target: 3 };
  return {
    done: progress.dailyQuestDate === today ? progress.dailyQuestDone : 0,
    target: progress.dailyQuestTarget,
  };
}
