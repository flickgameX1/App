import type { CognitiveLoad, Sprint, StatsLog, Task } from '../db/types';
import { LOAD_MULTIPLIER, taskXp } from './xp';

export const LOAD_ORDER: CognitiveLoad[] = ['easy', 'moderate', 'challenging', 'impossible'];

export interface DayPoint {
  date: string;
  xp: number;
  /** Running total including everything before the window. */
  cumulative: number;
}

/**
 * The growth curve. It carries whatever was earned before the window as its
 * starting height, so the line reads as a total climbing rather than restarting
 * from zero every time the window slides.
 */
export function cumulativeXp(logs: StatsLog[], days: string[], totalXp: number): DayPoint[] {
  const byDate = new Map(logs.map((l) => [l.date, l.xpEarned]));
  const inWindow = days.reduce((sum, d) => sum + (byDate.get(d) ?? 0), 0);
  let running = Math.max(0, totalXp - inWindow);
  return days.map((date) => {
    const xp = byDate.get(date) ?? 0;
    running += xp;
    return { date, xp, cumulative: running };
  });
}

/**
 * XP actually earned per task: the sprints it has banked, or the task's full
 * worth once it is finished and the remainder has been paid out.
 */
export function xpEarnedOn(task: Task, sprints: Sprint[]): number {
  if (task.status === 'done') return taskXp(task);
  return sprints.reduce((sum, s) => sum + s.xpAwarded, 0);
}

export interface LoadSlice {
  load: CognitiveLoad;
  xp: number;
  tasks: number;
  multiplier: number;
}

/** Where the XP came from, by how hard the work was to face. */
export function xpByLoad(tasks: Task[], sprints: Sprint[]): LoadSlice[] {
  const byTask = new Map<number, Sprint[]>();
  for (const sprint of sprints) {
    const list = byTask.get(sprint.taskId) ?? [];
    list.push(sprint);
    byTask.set(sprint.taskId, list);
  }

  return LOAD_ORDER.map((load) => {
    const matching = tasks.filter((t) => t.cognitiveLoad === load);
    return {
      load,
      xp: matching.reduce((sum, t) => sum + xpEarnedOn(t, byTask.get(t.id!) ?? []), 0),
      tasks: matching.filter((t) => t.status === 'done').length,
      multiplier: LOAD_MULTIPLIER[load],
    };
  });
}

export interface Totals {
  tasksCompleted: number;
  sprintsCompleted: number;
  focusMinutes: number;
}

export function totals(tasks: Task[], sprints: Sprint[]): Totals {
  return {
    tasksCompleted: tasks.filter((t) => t.status === 'done').length,
    sprintsCompleted: sprints.filter((s) => s.status === 'completed').length,
    // Every sprint's focused time counts, including the ones cut short.
    focusMinutes: Math.round(sprints.reduce((sum, s) => sum + s.actualLength, 0)),
  };
}
