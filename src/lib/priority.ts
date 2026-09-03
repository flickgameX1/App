import type { Priority } from '../db/types';

/** Top first. Shared by the list ordering and the row chrome. */
export const PRIORITY_ORDER: Priority[] = ['top', 'second', 'canWait'];

export const PRIORITY_RANK: Record<Priority, number> = { top: 0, second: 1, canWait: 2 };

export const PRIORITY_LABELS: Record<Priority, string> = {
  top: 'Top',
  second: 'Second',
  canWait: 'Can wait',
};
