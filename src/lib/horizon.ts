import type { Task } from '../db/types';

/**
 * Deadline-first ordering: dated tasks by date, then everything undated by how
 * urgent the user marked it, oldest first as the tie-break. V2 will re-rank this
 * with the pacing engine; V1 needs no pacing maths to be useful.
 */
export function horizonOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline - b.deadline;
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    if (a.urgency !== b.urgency) return b.urgency - a.urgency;
    return a.createdAt - b.createdAt;
  });
}
