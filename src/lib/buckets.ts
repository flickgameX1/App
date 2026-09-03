import type { TimeBucket } from '../db/types';

/**
 * Time buckets are derived from the duration the user types, never picked. They
 * set the XP base pool, which is why the boundary is stored on the task rather
 * than recomputed: changing these thresholds later must not silently rescore
 * work already done.
 */
export interface TimeBucketMeta {
  id: TimeBucket;
  label: string;
  /** Inclusive lower bound in minutes. */
  from: number;
}

export const TIME_BUCKETS: TimeBucketMeta[] = [
  { id: 'under30', label: 'under 30m', from: 0 },
  { id: 'halfToHour', label: '30m–1h', from: 30 },
  { id: 'oneToThree', label: '1–3h', from: 60 },
  { id: 'long', label: '3h+', from: 180 },
];

export function timeBucketFor(estimatedMinutes: number): TimeBucket {
  const minutes = Math.max(0, estimatedMinutes);
  let bucket: TimeBucket = TIME_BUCKETS[0].id;
  for (const b of TIME_BUCKETS) if (minutes >= b.from) bucket = b.id;
  return bucket;
}

export function timeBucketLabel(bucket: TimeBucket): string {
  return TIME_BUCKETS.find((b) => b.id === bucket)?.label ?? '';
}

/** Sprints needed to cover the estimate. Chunks the work; it does not score it. */
export function sprintsNeeded(estimatedMinutes: number, sprintLength: number): number {
  if (sprintLength <= 0) return 0;
  return Math.max(1, Math.ceil(estimatedMinutes / sprintLength));
}
