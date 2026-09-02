import type { Task } from '../db/types';
import { PRIORITY_RANK } from './priority';

/**
 * The list sorts by priority, then by deadline. It is an ordering, not a queue:
 * every task stays equally available whatever order they happen to sit in.
 */
export function sortForList(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    if (a.deadline && b.deadline && a.deadline !== b.deadline) return a.deadline - b.deadline;
    if (a.deadline !== b.deadline) return a.deadline ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}
