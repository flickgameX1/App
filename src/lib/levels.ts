/**
 * Levels widen as they climb: 175 XP to reach level 2, then 225 more, then 275.
 * Early levels arrive quickly enough to be worth having, later ones are earned.
 * XP only accumulates, so a level can never be lost.
 */
export function xpForLevel(level: number): number {
  const n = Math.max(0, level - 1);
  return 150 * n + 25 * n * n;
}

export function levelFor(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  return Math.floor((-150 + Math.sqrt(150 * 150 + 100 * xp)) / 50) + 1;
}

/**
 * Each level carries a name. An identity sticks where a bare number doesn't —
 * "steady builder" is something to be, "level 4" is something to have.
 */
export const LEVEL_TITLES = [
  'Just started',
  'Warming up',
  'Getting going',
  'Steady builder',
  'Found the rhythm',
  'Reliable',
  'Hard to derail',
  'Deep in it',
  'Quietly relentless',
  'Force of habit',
];

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(Math.max(1, level), LEVEL_TITLES.length) - 1];
}

export interface LevelProgress {
  level: number;
  title: string;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level spans. */
  span: number;
  /** 0 to 1, for the ring. */
  fraction: number;
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFor(totalXp);
  const floor = xpForLevel(level);
  const span = xpForLevel(level + 1) - floor;
  const into = Math.max(0, totalXp - floor);
  return { level, title: levelTitle(level), into, span, fraction: span > 0 ? into / span : 0 };
}
