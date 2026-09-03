import { db } from './db';
import { DEFAULT_PALETTE_ID } from '../lib/palettes';
import { dayKey } from '../lib/time';

/**
 * First-run rows. Both tables hold exactly one record, so this is idempotent and
 * safe to call on every boot.
 */
export async function ensureSeeded(): Promise<void> {
  await db.transaction('rw', db.settings, db.progress, async () => {
    if (!(await db.settings.get(1))) {
      await db.settings.put({ id: 1, activePaletteId: DEFAULT_PALETTE_ID, defaultSprintLength: 25 });
    }
    if (!(await db.progress.get(1))) {
      await db.progress.put({
        id: 1,
        level: 1,
        totalXp: 0,
        momentumDays: 0,
        dailyQuestTarget: 3,
        dailyQuestDone: 0,
        dailyQuestDate: dayKey(),
        badgesEarned: [],
      });
    }
  });
}
