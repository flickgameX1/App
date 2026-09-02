import { db } from '../db/db';
import { GENERAL_TEMPLATE, templateByKey } from './templates';

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

/**
 * Remember an edited breakdown as this user's version of the task type, so the
 * next task of the same kind starts from their steps instead of the generic
 * template. Skipped for the general fallback: those steps belong to one
 * unmatched task, and saving them would rewrite the default for every other
 * unmatched task too.
 */
export async function rememberBreakdown(taskType: string, texts: string[]): Promise<void> {
  if (taskType === GENERAL_TEMPLATE.key) return;
  const steps = texts.map((t) => t.trim()).filter(Boolean);
  if (!steps.length) return;
  const existing = await db.breakdowns.where('taskType').equals(taskType).first();
  const row = { taskType, steps, source: 'personal' as const, updatedAt: Date.now() };
  if (existing?.id) await db.breakdowns.update(existing.id, row);
  else await db.breakdowns.add(row);
}
