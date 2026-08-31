export interface Point {
  /** Day key, used as the stable identity of the column. */
  date: string;
  label: string;
  value: number;
}

/** Round an axis maximum up to a clean 1 / 2 / 5 × 10ⁿ so ticks read as numbers. */
export function niceMax(value: number, floor = 4): number {
  const target = Math.max(value, floor);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= target) return candidate;
  }
  return 10 * magnitude;
}

export const CHART_PAD = { top: 14, right: 30, bottom: 22, left: 30 };
