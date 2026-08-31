/** Local-time day key, YYYY-MM-DD. All stats bucket on this. */
export function dayKey(at: number | Date = Date.now()): string {
  const d = at instanceof Date ? at : new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(at: number | Date = Date.now()): Date {
  const d = at instanceof Date ? new Date(at) : new Date(at);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The last `n` day keys, oldest first, ending today. */
export function lastNDays(n: number, from: number = Date.now()): string[] {
  const out: string[] = [];
  const base = startOfDay(from);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

export function daysUntil(deadline: number, from: number = Date.now()): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(deadline).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Plain, factual due labels — no "late by" phrasing anywhere, since these render
 * on the Now screen where pressure is not allowed.
 */
export function dueLabel(deadline: number, from: number = Date.now()): string {
  const diff = daysUntil(deadline, from);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const d = new Date(deadline);
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
