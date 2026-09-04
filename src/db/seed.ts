import { db } from './db';
import { DEFAULT_PALETTE_ID, PALETTES } from '../lib/palettes';
import { dayKey } from '../lib/time';

/**
 * First-run rows. Both tables hold exactly one record, so this is idempotent and
 * safe to call on every boot.
 */
export async function ensureSeeded(): Promise<void> {
  await db.transaction('rw', db.settings, db.progress, async () => {
    const settings = await db.settings.get(1);
    if (!settings) {
      await db.settings.put({ id: 1, activePaletteId: DEFAULT_PALETTE_ID, defaultSprintLength: 25 });
    } else if (!PALETTES.some((p) => p.id === settings.activePaletteId)) {
      // A palette that no longer exists — an install from before the themes were
      // reworked. Fall back rather than leaving the picker with nothing selected.
      await db.settings.update(1, { activePaletteId: DEFAULT_PALETTE_ID });
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
