import { db } from '../db/db';
import { templateByKey } from './templates';

/**
 * The steps to attach to a new task: the user's own version of this task type if
 * they have ever edited one, otherwise the generic starter template.
 */
export async function resolveStepTexts(taskType: string): Promise<string[]> {
  const personal = await db.breakdowns.where('taskType').equals(taskType).first();
  return personal?.steps ?? templateByKey(taskType).steps;
}

/** How many steps a type currently offers, for the preview during creation. */
export async function stepCountFor(taskType: string): Promise<number> {
  return (await resolveStepTexts(taskType)).length;
}
