/**
 * Stage 0 tests: the data layer, the derived fields, the palette token system,
 * and the breakdown matching carried over from the scaffold.
 *
 * Run with `npm test` — esbuild bundles this and node executes it, so there is
 * no test framework to keep in step with the app's toolchain.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { db } from '../src/db/db';
import { ensureSeeded } from '../src/db/seed';
import type { Task } from '../src/db/types';
import { createTask, deleteTask } from '../src/db/actions';
import { sprintsNeeded, timeBucketFor, timeBucketLabel } from '../src/lib/buckets';
import { partialXp, taskXp } from '../src/lib/xp';
import { pacePlan } from '../src/lib/pace';
import { sortForList } from '../src/lib/ordering';
import { DEFAULT_PALETTE_ID, PALETTES, PALETTE_TOKENS, paletteById } from '../src/lib/palettes';
import { matchTemplate } from '../src/lib/matching';
import { dayKey, daysUntil, dueLabel, formatClock, formatDuration, lastNDays, parseDuration } from '../src/lib/time';

let failures = 0;
let checks = 0;

function check(name: string, actual: unknown, expected: unknown) {
  checks++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.log(`FAIL  ${name}\n        expected ${e}\n        actual   ${a}`);
  }
}

const ok = (name: string, condition: boolean) => check(name, condition, true);

// --- time buckets, derived from the typed duration ---------------------------
check('bucket: 20 minutes', timeBucketFor(20), 'under30');
check('bucket: the boundary belongs to the bucket above', timeBucketFor(30), 'halfToHour');
check('bucket: an hour', timeBucketFor(60), 'oneToThree');
check('bucket: a long haul', timeBucketFor(400), 'long');
check('bucket: nonsense input still lands somewhere', timeBucketFor(-5), 'under30');
check(
  'bucket: labels',
  (['under30', 'halfToHour', 'oneToThree', 'long'] as const).map(timeBucketLabel),
  ['under 30m', '30m–1h', '1–3h', '3h+'],
);

check('sprints: 90 minutes at 25', sprintsNeeded(90, 25), 4);
check('sprints: an exact fit does not round up', sprintsNeeded(50, 25), 2);
check('sprints: anything at all is one sprint', sprintsNeeded(5, 25), 1);
check('sprints: a nonsense length does not divide by zero', sprintsNeeded(60, 0), 0);

// --- palettes ----------------------------------------------------------------
// `npm test` runs from the package root, so this is stable.
const css = readFileSync('src/index.css', 'utf8');
for (const palette of PALETTES) {
  // Ember answers to bare :root as the default, so it has no selector of its own
  // to find beyond the shared block.
  const block = css.match(new RegExp(`\\[data-palette='${palette.id}'\\][^{]*\\{([^}]*)\\}`));
  ok(`palette: ${palette.id} has a token block`, block !== null);
  for (const token of PALETTE_TOKENS) {
    ok(`palette: ${palette.id} defines --pal-${token}`, (block?.[1] ?? '').includes(`--pal-${token}:`));
  }
  ok(`palette: ${palette.id} declares a colour scheme`, (block?.[1] ?? '').includes('color-scheme'));
}
ok('palette: a light theme ships for light-sensitivity', PALETTES.some((p) => p.scheme === 'light'));
check('palette: unknown ids fall back rather than throwing', paletteById('nope').id, DEFAULT_PALETTE_ID);
check('palette: the default exists', paletteById(DEFAULT_PALETTE_ID).name, 'Ember');

// --- the data layer ----------------------------------------------------------
await ensureSeeded();
await ensureSeeded(); // must be idempotent — it runs on every boot
check('seed: exactly one settings row', await db.settings.count(), 1);
check('seed: exactly one progress row', await db.progress.count(), 1);
const settings = await db.settings.get(1);
check('seed: default palette', settings?.activePaletteId, DEFAULT_PALETTE_ID);
check('seed: default sprint length', settings?.defaultSprintLength, 25);
const progress = await db.progress.get(1);
check('seed: progress starts at level 1 with nothing earned', [progress?.level, progress?.totalXp, progress?.momentumDays], [1, 0, 0]);
check('seed: a daily quest target exists', progress?.dailyQuestTarget, 3);

const task: Task = {
  title: 'Write the history essay',
  type: 'essay',
  priority: 'top',
  cognitiveLoad: 'challenging',
  estimatedMinutes: 240,
  timeBucket: timeBucketFor(240),
  sprintLength: 25,
  deadline: Date.UTC(2026, 8, 10),
  status: 'active',
  createdAt: Date.now(),
};
const taskId = (await db.tasks.add(task)) as number;
const stored = await db.tasks.get(taskId);
check('tasks: every field survives the round trip', { ...stored, id: undefined }, { ...task, id: undefined });
check('tasks: the derived bucket is stored, not recomputed', stored?.timeBucket, 'long');

await db.steps.bulkAdd([
  { taskId, text: 'Brain-dump the argument', done: false, order: 1 },
  { taskId, text: 'Open the doc', done: false, order: 0 },
  { taskId, text: 'Write the worst first paragraph', done: false, order: 2 },
]);
const steps = await db.steps.where({ taskId }).sortBy('order');
check('steps: read back in their own order', steps.map((s) => s.text), [
  'Open the doc',
  'Brain-dump the argument',
  'Write the worst first paragraph',
]);
check('steps: nothing is done until the user says so', steps.every((s) => !s.done), true);

// A sprint records the goal in the user's words, and which steps it came from.
const sprintId = (await db.sprints.add({
  taskId,
  goalText: 'write introduction',
  stepIds: [steps[0].id!, steps[2].id!],
  plannedLength: 25,
  actualLength: 0,
  status: 'running',
  startedAt: Date.now(),
  pausedMs: 0,
  xpAwarded: 0,
})) as number;
const sprint = await db.sprints.get(sprintId);
check('sprints: the goal is free text, kept verbatim', sprint?.goalText, 'write introduction');
check('sprints: steps can be picked out of sequence', sprint?.stepIds?.length, 2);
check('sprints: one running sprint is findable', (await db.sprints.where('status').equals('running').toArray()).length, 1);

check('breakdowns: one personal version per task type', await (async () => {
  await db.breakdowns.add({ taskType: 'essay', steps: ['Mine'], source: 'personal', updatedAt: Date.now() });
  try {
    await db.breakdowns.add({ taskType: 'essay', steps: ['Duplicate'], source: 'personal', updatedAt: Date.now() });
    return 'duplicate allowed';
  } catch {
    return 'rejected';
  }
})(), 'rejected');


// --- XP: two axes, sprint count deliberately absent ---------------------------
check('xp: a short easy task', taskXp({ timeBucket: 'under30', cognitiveLoad: 'easy' }), 20);
check('xp: a long impossible one', taskXp({ timeBucket: 'long', cognitiveLoad: 'impossible' }), 550);
check('xp: load multiplies the pool', taskXp({ timeBucket: 'oneToThree', cognitiveLoad: 'challenging' }), 190);
ok(
  'xp: harder always pays more at the same size',
  taskXp({ timeBucket: 'oneToThree', cognitiveLoad: 'impossible' }) >
    taskXp({ timeBucket: 'oneToThree', cognitiveLoad: 'easy' }),
);
check('xp: stopping half way pays half', partialXp({ timeBucket: 'long', cognitiveLoad: 'easy' }, 3, 6), 110);
check('xp: no sprints done, nothing forfeited but nothing earned', partialXp({ timeBucket: 'long', cognitiveLoad: 'easy' }, 0, 6), 0);
check('xp: overrunning the plan does not overpay', partialXp({ timeBucket: 'long', cognitiveLoad: 'easy' }, 9, 6), 220);

// --- typed durations ----------------------------------------------------------
check('duration: bare minutes', parseDuration('90'), 90);
check('duration: minutes with a unit', parseDuration('45m'), 45);
check('duration: hours', parseDuration('2h'), 120);
check('duration: hours and minutes, no space', parseDuration('1h30'), 90);
check('duration: hours and minutes, spelled out', parseDuration('1 hour 30 mins'), 90);
check('duration: fractional hours', parseDuration('1.5 hours'), 90);
check('duration: a comma decimal', parseDuration('1,5h'), 90);
check('duration: nonsense is rejected rather than guessed', parseDuration('soon'), null);
check('duration: empty is not zero', parseDuration('  '), null);

// --- pace: a target ahead, never a deficit behind ------------------------------
check('pace: spread over the days left', pacePlan(6, 3), { sprintsPerDay: 2, daysLeft: 3 });
check('pace: a deadline today is all for today', pacePlan(4, 0), { sprintsPerDay: 4, daysLeft: 1 });
check('pace: a past deadline still gets a plan, not a debt', pacePlan(4, -3), { sprintsPerDay: 4, daysLeft: 1 });
check('pace: nothing left, nothing to say', pacePlan(0, 5), null);
check('pace: no deadline, no pace', pacePlan(6, null), null);

// --- creating a task attaches its breakdown -----------------------------------
const newId = await createTask({
  title: 'tidy bedroom',
  priority: 'top',
  cognitiveLoad: 'easy',
  estimatedMinutes: 45,
  sprintLength: 20,
});
const created = await db.tasks.get(newId);
check('create: the type is matched from the title', created?.type, 'clean-room');
check('create: the bucket is derived, not asked for', created?.timeBucket, 'halfToHour');
const createdSteps = await db.steps.where({ taskId: newId }).sortBy('order');
ok('create: the breakdown is attached as steps', createdSteps.length > 0);
check('create: steps start unticked and in order', createdSteps.map((s) => s.order), [...createdSteps.keys()]);

// A personal breakdown for that type wins over the generic template.
await db.breakdowns.put({ taskType: 'clean-room', steps: ['Open a window', 'Bin bag first'], source: 'personal', updatedAt: Date.now() });
const personalId = await createTask({
  title: 'clean my room',
  priority: 'canWait',
  cognitiveLoad: 'moderate',
  estimatedMinutes: 30,
  sprintLength: 25,
});
check(
  'create: a personal breakdown is used instead of the template',
  (await db.steps.where({ taskId: personalId }).sortBy('order')).map((s) => s.text),
  ['Open a window', 'Bin bag first'],
);

await deleteTask(personalId);
check('delete: the task goes', await db.tasks.get(personalId), undefined);
check('delete: its steps go with it', await db.steps.where({ taskId: personalId }).count(), 0);

// --- list order ---------------------------------------------------------------
const row = (over: Partial<Task>): Task => ({
  title: 'x',
  type: 'general',
  priority: 'second',
  cognitiveLoad: 'moderate',
  estimatedMinutes: 60,
  timeBucket: 'oneToThree',
  sprintLength: 25,
  status: 'active',
  createdAt: 0,
  ...over,
});
const day2 = 86_400_000;
check(
  'list: priority first, then deadline',
  sortForList([
    row({ title: 'can-wait', priority: 'canWait', createdAt: 1 }),
    row({ title: 'second-later', priority: 'second', deadline: 2 * day2 }),
    row({ title: 'top', priority: 'top', createdAt: 3 }),
    row({ title: 'second-sooner', priority: 'second', deadline: day2 }),
  ]).map((t: Task) => t.title),
  ['top', 'second-sooner', 'second-later', 'can-wait'],
);
check(
  'list: a dated task outranks an undated one at the same priority',
  sortForList([row({ title: 'undated' }), row({ title: 'dated', deadline: day2 })]).map((t: Task) => t.title),
  ['dated', 'undated'],
);

// --- breakdown matching (carried over) ---------------------------------------
const MATCHES: [string, string][] = [
  ['tidy bedroom', 'clean-room'],
  ['clean my room', 'clean-room'],
  ['write history essay', 'essay'],
  ['reply to emails', 'email'],
  ['revise biology', 'study'],
  ['do the washing up', 'dishes'],
  ['put the washing on', 'laundry'],
  ['call the dentist', 'call'],
  ['do my taxes', 'admin'],
  ['fix the login bug', 'code'],
  ['go to the gym', 'exercise'],
  ['grocery shopping', 'errands'],
  ['cook dinner', 'meal'],
  ['read chapter 3', 'reading'],
  ['plan the trip', 'planning'],
  ['update my cv', 'job-application'],
  ['water the plants', 'general'],
  ['', 'general'],
];
for (const [title, expected] of MATCHES) {
  check(`match: ${title || '(empty)'}`, matchTemplate(title).template.key, expected);
}

// --- time helpers ------------------------------------------------------------
const noon = new Date(2026, 7, 31, 12, 0, 0).getTime();
const day = 86_400_000;
check('time: day key is local', dayKey(noon), '2026-08-31');
check('time: window ends today', lastNDays(3, noon), ['2026-08-29', '2026-08-30', '2026-08-31']);
check('time: days until is whole days', daysUntil(noon + 2 * day, noon), 2);
check('time: due today', dueLabel(noon, noon), 'Today');
check('time: a past deadline is stated plainly', dueLabel(noon - day, noon), 'Yesterday');
check('time: clock format', formatClock(65_000), '1:05');
check('time: durations read as words', [formatDuration(45), formatDuration(90)], ['45m', '1h 30m']);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
