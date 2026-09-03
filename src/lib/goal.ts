import type { Step } from '../db/types';

/**
 * The sprint goal, built from whichever steps the user picked. Selection order
 * is deliberately ignored in favour of step order — the point is which pieces
 * this sprint covers, not the sequence they were tapped in, and nothing here
 * decides what has to come first.
 */
export function goalFromSteps(steps: Step[], selectedIds: number[]): string {
  const picked = new Set(selectedIds);
  return steps
    .filter((s) => s.id !== undefined && picked.has(s.id))
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(' + ');
}

/** What one sprint is worth, and what is left on the task. */
export function xpPreview(totalXp: number, sprintsPlanned: number, sprintsDone: number): {
  perSprint: number;
  earned: number;
  remaining: number;
} {
  if (sprintsPlanned <= 0) return { perSprint: 0, earned: 0, remaining: totalXp };
  const perSprint = Math.round(totalXp / sprintsPlanned);
  const earned = Math.round(totalXp * Math.min(1, sprintsDone / sprintsPlanned));
  return { perSprint, earned, remaining: Math.max(0, totalXp - earned) };
}
