import { db } from '../db/db';
import type { Step } from '../db/types';
import { GENERAL_TEMPLATE, templateByKey } from './templates';

let stepSeq = 0;
export function makeStep(text: string): Step {
  stepSeq += 1;
  return { id: `${Date.now().toString(36)}-${stepSeq.toString(36)}`, text, done: false };
}

/**
 * The steps to offer for a task type: the user's own version if they have ever
 * edited this type's breakdown, otherwise the generic starter template.
 */
export async function resolveSteps(taskType: string): Promise<Step[]> {
  const personal = await db.breakdowns.where('taskType').equals(taskType).first();
  const texts = personal?.steps ?? templateByKey(taskType).steps;
  return texts.map(makeStep);
}

/**
 * Remember an edited breakdown as this user's version of the type. Skipped for
 * the general fallback: those steps belong to one unmatched task, and saving
 * them would rewrite the default for every other unmatched task too.
 */
export async function rememberBreakdown(taskType: string, steps: Step[]): Promise<void> {
  if (taskType === GENERAL_TEMPLATE.key) return;
  const texts = steps.map((s) => s.text.trim()).filter(Boolean);
  if (!texts.length) return;
  const existing = await db.breakdowns.where('taskType').equals(taskType).first();
  const row = { taskType, steps: texts, source: 'personal' as const, updatedAt: Date.now() };
  if (existing?.id) await db.breakdowns.update(existing.id, row);
  else await db.breakdowns.add(row);
}

export async function forgetBreakdown(taskType: string): Promise<void> {
  await db.breakdowns.where('taskType').equals(taskType).delete();
}
