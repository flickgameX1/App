import { db } from './db';
import type { CognitiveLoad, Priority, Task } from './types';
import { matchTemplate } from '../lib/matching';
import { resolveStepTexts } from '../lib/breakdowns';
import { timeBucketFor } from '../lib/buckets';

export interface NewTaskInput {
  title: string;
  /** Breakdown template key. Falls back to fuzzy-matching the title. */
  type?: string;
  priority: Priority;
  cognitiveLoad: CognitiveLoad;
  estimatedMinutes: number;
  sprintLength: number;
  deadline?: number;
}

/**
 * Creates the task and attaches its breakdown as selectable steps. The steps are
 * rows from the start, in order but not sequenced — nothing here decides which
 * one has to be done first.
 */
export async function createTask(input: NewTaskInput): Promise<number> {
  const type = input.type ?? matchTemplate(input.title).template.key;
  const stepTexts = await resolveStepTexts(type);

  return db.transaction('rw', db.tasks, db.steps, async () => {
    const task: Task = {
      title: input.title.trim(),
      type,
      priority: input.priority,
      cognitiveLoad: input.cognitiveLoad,
      estimatedMinutes: input.estimatedMinutes,
      timeBucket: timeBucketFor(input.estimatedMinutes),
      sprintLength: input.sprintLength,
      deadline: input.deadline,
      status: 'active',
      createdAt: Date.now(),
    };
    const taskId = (await db.tasks.add(task)) as number;
    await db.steps.bulkAdd(
      stepTexts.map((text, order) => ({ taskId, text, done: false, order })),
    );
    return taskId;
  });
}

export async function deleteTask(taskId: number): Promise<void> {
  await db.transaction('rw', db.tasks, db.steps, db.sprints, async () => {
    await db.steps.where('taskId').equals(taskId).delete();
    await db.sprints.where('taskId').equals(taskId).delete();
    await db.tasks.delete(taskId);
  });
}
