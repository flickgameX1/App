import type { Priority } from '../db/types';
import { PRIORITY_LABELS } from '../lib/priority';

/**
 * Priority owns the row's colour — the bar and the dot. Cognitive load stays a
 * neutral chip: one visual channel cannot carry two variables without turning
 * into noise, and priority is what the eye sorts by.
 */
export const PRIORITY_META: Record<Priority, { label: string; bar: string; dot: string }> = {
  top: { label: PRIORITY_LABELS.top, bar: 'bg-p1', dot: 'bg-p1' },
  second: { label: PRIORITY_LABELS.second, bar: 'bg-p2', dot: 'bg-p2' },
  canWait: { label: PRIORITY_LABELS.canWait, bar: 'bg-p3', dot: 'bg-p3' },
};
