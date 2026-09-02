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
