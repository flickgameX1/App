/**
 * Milestones for things that actually happened. Every badge is additive and
 * permanent — once earned it is never revoked, never expires and never needs
 * maintaining. Nothing in this app can take something away.
 */
export interface BadgeSnapshot {
  tasksCompleted: number;
  sprintsCompleted: number;
  level: number;
  momentum: number;
  /** Finished tasks that were in the longest time bucket. */
  longTasksCompleted: number;
  /** Finished tasks the user had marked "impossible". */
  impossibleTasksCompleted: number;
}

export interface Badge {
  id: string;
  name: string;
  hint: string;
  earned: (s: BadgeSnapshot) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first-task', name: 'First one down', hint: 'Finish a task', earned: (s) => s.tasksCompleted >= 1 },
  { id: 'ten-sprints', name: 'Ten sprints', hint: 'Finish 10 sprints', earned: (s) => s.sprintsCompleted >= 10 },
  {
    id: 'faced-it',
    name: 'Faced it',
    hint: 'Finish a task you marked impossible',
    earned: (s) => s.impossibleTasksCompleted >= 1,
  },
  {
    id: 'long-haul',
    name: 'Long haul',
    hint: 'Finish a task of 3 hours or more',
    earned: (s) => s.longTasksCompleted >= 1,
  },
  { id: 'level-five', name: 'Level five', hint: 'Reach level 5', earned: (s) => s.level >= 5 },
  {
    id: 'two-weeks',
    name: 'Two weeks of momentum',
    hint: 'Reach 14 days of momentum',
    earned: (s) => s.momentum >= 14,
  },
  { id: 'fifty-sprints', name: 'Fifty sprints', hint: 'Finish 50 sprints', earned: (s) => s.sprintsCompleted >= 50 },
  {
    id: 'hundred-sprints',
    name: 'A hundred sprints',
    hint: 'Finish 100 sprints',
    earned: (s) => s.sprintsCompleted >= 100,
  },
];

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}

/** Which badges the snapshot has earned that aren't already held. */
export function newlyEarned(snapshot: BadgeSnapshot, held: string[]): string[] {
  const have = new Set(held);
  return BADGES.filter((b) => !have.has(b.id) && b.earned(snapshot)).map((b) => b.id);
}
