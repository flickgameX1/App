import { db } from '../db/db';
import type { Breakdown, Progress, Settings, Sprint, StatsLog, Step, Task } from '../db/types';

/**
 * There is no account and no server, so a file you keep is the only real safety
 * net — and the only way to move between devices. Bump this if the shape of the
 * data ever changes in a way an older file could not satisfy.
 */
export const BACKUP_VERSION = 1;

export interface Backup {
  app: 'sprint';
  version: number;
  exportedAt: string;
  tasks: Task[];
  steps: Step[];
  breakdowns: Breakdown[];
  sprints: Sprint[];
  statsLogs: StatsLog[];
  progress: Progress[];
  settings: Settings[];
}

export async function buildBackup(): Promise<Backup> {
  const [tasks, steps, breakdowns, sprints, statsLogs, progress, settings] = await Promise.all([
    db.tasks.toArray(),
    db.steps.toArray(),
    db.breakdowns.toArray(),
    db.sprints.toArray(),
    db.statsLogs.toArray(),
    db.progress.toArray(),
    db.settings.toArray(),
  ]);
  return {
    app: 'sprint',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    steps,
    breakdowns,
    sprints,
    statsLogs,
    progress,
    settings,
  };
}

export interface BackupSummary {
  tasks: number;
  sprints: number;
  days: number;
}

export function summarise(backup: Backup): BackupSummary {
  return { tasks: backup.tasks.length, sprints: backup.sprints.length, days: backup.statsLogs.length };
}

/**
 * Rejects anything that isn't one of our files rather than half-importing it —
 * a partial restore over real data would be worse than no restore at all.
 */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't readable JSON.");
  }
  const b = raw as Partial<Backup>;
  if (b?.app !== 'sprint') throw new Error("That doesn't look like a Sprint backup.");
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new Error('That backup came from a newer version of the app.');
  }
  const tables: (keyof Backup)[] = ['tasks', 'steps', 'breakdowns', 'sprints', 'statsLogs', 'progress', 'settings'];
  for (const table of tables) {
    if (!Array.isArray(b[table])) throw new Error(`That backup is missing its ${table}.`);
  }
  return b as Backup;
}

/** Replaces everything. The caller is responsible for asking first. */
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction(
    'rw',
    [db.tasks, db.steps, db.breakdowns, db.sprints, db.statsLogs, db.progress, db.settings],
    async () => {
      await Promise.all([
        db.tasks.clear(),
        db.steps.clear(),
        db.breakdowns.clear(),
        db.sprints.clear(),
        db.statsLogs.clear(),
        db.progress.clear(),
        db.settings.clear(),
      ]);
      await Promise.all([
        db.tasks.bulkAdd(backup.tasks),
        db.steps.bulkAdd(backup.steps),
        db.breakdowns.bulkAdd(backup.breakdowns),
        db.sprints.bulkAdd(backup.sprints),
        db.statsLogs.bulkAdd(backup.statsLogs),
        db.progress.bulkAdd(backup.progress),
        db.settings.bulkAdd(backup.settings),
      ]);
    },
  );
}

export function backupFilename(at: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `sprint-backup-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}.json`;
}
