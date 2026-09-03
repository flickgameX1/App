import { dayKey } from './time';

/** Monday-first, so weekends sit together at the end of the row. */
export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface MonthCursor {
  year: number;
  /** 0-indexed, as Date uses. */
  month: number;
}

export function addMonths({ year, month }: MonthCursor, delta: number): MonthCursor {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function monthLabel({ year, month }: MonthCursor): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function cursorFor(dateKey: string): MonthCursor {
  const [year, month] = dateKey.split('-').map(Number);
  return { year, month: month - 1 };
}

/** Monday index of a date: 0 = Monday, 6 = Sunday. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * The month as whole weeks, padded either end with the neighbouring months' days
 * so the grid is always rectangular and never reflows as you page through.
 */
export function monthGrid({ year, month }: MonthCursor): string[][] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - mondayIndex(first));

  const weeks: string[][] = [];
  const cursor = new Date(start);
  while (weeks.length < 6) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(dayKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // Stop once the month is covered rather than always drawing six rows.
    if (cursor.getMonth() !== month && cursor > new Date(year, month + 1, 0)) break;
  }
  return weeks;
}

/** The Monday-to-Sunday week containing a given day. */
export function weekOf(dateKey: string): string[] {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - mondayIndex(date));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(date);
    day.setDate(day.getDate() + i);
    return dayKey(day);
  });
}

export function isInMonth(dateKey: string, { year, month }: MonthCursor): boolean {
  const [y, m] = dateKey.split('-').map(Number);
  return y === year && m - 1 === month;
}
