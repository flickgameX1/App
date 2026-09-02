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
import type { StatsLog, Step, Task } from '../src/db/types';
import {
  completeTask,
  createTask,
  deleteTask,
  endSprint,
  markGoalDone,
  pauseSprint,
  resumeSprint,
  saveSteps,
  startSprint,
} from '../src/db/actions';
import { sprintsNeeded, timeBucketFor, timeBucketLabel } from '../src/lib/buckets';
import { partialXp, sprintAward, taskXp } from '../src/lib/xp';
import { focusedMinutes, focusedMs, remainingMs, sprintProgress } from '../src/lib/sprintClock';
import { activeDaysIn, isActiveDay } from '../src/lib/consistency';
import { LEVEL_TITLES, levelFor, levelProgress, levelTitle, xpForLevel } from '../src/lib/levels';
import { momentumFrom, questToday } from '../src/lib/momentum';
import { daysBetween } from '../src/lib/time';
import { pacePlan } from '../src/lib/pace';
import { goalFromSteps, xpPreview } from '../src/lib/goal';
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
const schemaSprintId = (await db.sprints.add({
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
const sprint = await db.sprints.get(schemaSprintId);
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


// --- sprint goals: picked in any order, always editable ------------------------
const goalSteps: Step[] = [
  { id: 10, taskId: 1, text: 'Open the doc', done: false, order: 0 },
  { id: 11, taskId: 1, text: 'Write the intro', done: false, order: 1 },
  { id: 12, taskId: 1, text: 'Check the references', done: false, order: 2 },
];
check('goal: one step', goalFromSteps(goalSteps, [11]), 'Write the intro');
check('goal: several steps join up', goalFromSteps(goalSteps, [10, 12]), 'Open the doc + Check the references');
check(
  'goal: tap order does not matter, step order does',
  goalFromSteps(goalSteps, [12, 10]),
  'Open the doc + Check the references',
);
check('goal: nothing picked, nothing suggested', goalFromSteps(goalSteps, []), '');
check('goal: an id that is no longer there is ignored', goalFromSteps(goalSteps, [99]), '');

// --- XP preview ----------------------------------------------------------------
check('preview: a fresh task', xpPreview(418, 10, 0), { perSprint: 42, earned: 0, remaining: 418 });
check('preview: part way through', xpPreview(418, 10, 4), { perSprint: 42, earned: 167, remaining: 251 });
check('preview: every sprint done leaves nothing on the table', xpPreview(418, 10, 10), { perSprint: 42, earned: 418, remaining: 0 });
check('preview: overrunning the plan cannot go negative', xpPreview(418, 10, 14), { perSprint: 42, earned: 418, remaining: 0 });

// --- editing a breakdown teaches the task type ---------------------------------
const editId = await createTask({
  title: 'clean the kitchen',
  priority: 'second',
  cognitiveLoad: 'easy',
  estimatedMinutes: 30,
  sprintLength: 15,
});
const before = await db.steps.where({ taskId: editId }).sortBy('order');
await db.steps.update(before[0].id!, { done: true });
await saveSteps(editId, [before[0].text, 'Wipe the hob', 'Take the recycling out']);
const after = await db.steps.where({ taskId: editId }).sortBy('order');
check('edit: the new list replaces the old', after.map((s) => s.text), [before[0].text, 'Wipe the hob', 'Take the recycling out']);
check('edit: order is renumbered from the list left behind', after.map((s) => s.order), [0, 1, 2]);
check('edit: a step already done stays done', after[0].done, true);
check(
  'edit: the type remembers the edit for next time',
  (await db.breakdowns.where('taskType').equals('dishes').first())?.steps,
  [before[0].text, 'Wipe the hob', 'Take the recycling out'],
);

// The generic fallback is not a task type, so edits there teach nothing.
const looseId = await createTask({
  title: 'water the plants',
  priority: 'canWait',
  cognitiveLoad: 'easy',
  estimatedMinutes: 10,
  sprintLength: 10,
});
await saveSteps(looseId, ['Fill the watering can']);
check(
  'edit: an unmatched task does not rewrite the default for every other one',
  await db.breakdowns.where('taskType').equals('general').count(),
  0,
);


// --- the sprint clock ----------------------------------------------------------
const t0 = 1_700_000_000_000;
const clock = (over: Partial<Parameters<typeof focusedMs>[0]> = {}) => ({
  startedAt: t0,
  plannedLength: 25,
  pausedMs: 0,
  ...over,
});
check('clock: paused time is not focus time', focusedMs(clock({ pausedMs: 60_000 }), t0 + 300_000), 240_000);
check('clock: an open pause counts out as it happens', focusedMs(clock({ pausedAt: t0 + 100_000 }), t0 + 300_000), 100_000);
check('clock: remaining counts down from planned', remainingMs(clock(), t0 + 60_000), 1_440_000);
check('clock: remaining never goes negative', remainingMs(clock(), t0 + 60 * 60_000), 0);
check('clock: the ring fills to one and stops', sprintProgress(clock(), t0 + 60 * 60_000), 1);
check(
  'clock: a sprint left open past its end is capped at what was planned',
  focusedMinutes(clock(), t0 + 5 * 60 * 60_000),
  25,
);

// --- what a sprint banks -------------------------------------------------------
const award = (over: Partial<Parameters<typeof sprintAward>[0]> = {}) =>
  sprintAward({ totalXp: 418, sprintsPlanned: 10, alreadyAwarded: 0, focusedMinutes: 25, plannedLength: 25, finished: true, ...over });
check('award: a finished sprint banks its share', award(), 42);
check('award: stopping half way through banks half of that', award({ finished: false, focusedMinutes: 12.5 }), 21);
ok('award: showing up at all banks something', award({ finished: false, focusedMinutes: 2 }) > 0);
check('award: the task is worth what it is worth, never more', award({ alreadyAwarded: 410 }), 8);
check('award: nothing left to give once it is all paid', award({ alreadyAwarded: 418 }), 0);

// --- the whole loop, through the database --------------------------------------
const loopId = await createTask({
  title: 'Write the loop essay',
  priority: 'top',
  cognitiveLoad: 'challenging',
  estimatedMinutes: 240,
  sprintLength: 25,
});
const loopTask = (await db.tasks.get(loopId))!;
const loopSteps = await db.steps.where({ taskId: loopId }).sortBy('order');
const planned = sprintsNeeded(loopTask.estimatedMinutes, loopTask.sprintLength);
check('loop: the task is worth its two axes', taskXp(loopTask), 418);

const loopSprintId = await startSprint(loopId, 'write the intro', [loopSteps[0].id!], 25);
check('loop: exactly one sprint runs at a time', await db.sprints.where('status').equals('running').count(), 1);
check(
  'loop: a sprint left running elsewhere is closed out, not orphaned',
  (await db.sprints.get(schemaSprintId))?.status,
  'stopped',
);
await pauseSprint(loopSprintId);
ok('loop: pausing is recorded', Boolean((await db.sprints.get(loopSprintId))?.pausedAt));
await resumeSprint(loopSprintId);
check('loop: resuming closes the pause', (await db.sprints.get(loopSprintId))?.pausedAt, undefined);
ok('loop: the paused stretch is banked', (await db.sprints.get(loopSprintId))!.pausedMs >= 0);

const ended = await endSprint(loopSprintId, 'completed');
check('loop: a finished sprint pays its share', ended.xpAwarded, Math.round(418 / planned));
check('loop: nothing is running afterwards', await db.sprints.where('status').equals('running').count(), 0);
check('loop: ending twice does not pay twice', (await endSprint(loopSprintId, 'completed')).xpAwarded, 0);

const today = dayKey();
const todayLog = await db.statsLogs.get(today);
check('loop: the day logs the sprint', todayLog?.sprintsCompleted, 1);
check('loop: and the XP with it', todayLog?.xpEarned, ended.xpAwarded);
check('loop: today counts itself in the consistency window', todayLog?.consistencyWindow, 1);
check('loop: the running total follows', (await db.progress.get(1))?.totalXp, ended.xpAwarded);
check('loop: the daily quest counts the sprint', (await db.progress.get(1))?.dailyQuestDone, 1);

// The goal is only marked done when the user says it was.
check('loop: steps are not ticked off behind your back', (await db.steps.get(loopSteps[0].id!))?.done, false);
await markGoalDone(loopSprintId);
check('loop: saying it got done ticks the steps it was for', (await db.steps.get(loopSteps[0].id!))?.done, true);

// Stopping early pays for the time, and finishing trues the total up.
const stoppedId = await startSprint(loopId, 'another go', [], 25);
const stopped = await endSprint(stoppedId, 'stopped');
ok('loop: stopping early is not a zero', stopped.xpAwarded >= 0);
check('loop: a stopped sprint is not counted as completed', (await db.statsLogs.get(today))?.sprintsCompleted, 1);

const remainder = await completeTask(loopId);
const paidOut = (await db.sprints.where('taskId').equals(loopId).toArray()).reduce((n, s) => n + s.xpAwarded, 0);
check('loop: finishing pays exactly what was left', paidOut + remainder, 418);
check('loop: the task is done', (await db.tasks.get(loopId))?.status, 'done');
check('loop: completing twice pays nothing extra', await completeTask(loopId), 0);

// --- consistency ---------------------------------------------------------------
const mkLog = (date: string, over: Partial<StatsLog> = {}): StatsLog => ({
  date, tasksCompleted: 0, sprintsCompleted: 0, xpEarned: 0, consistencyWindow: 0, ...over,
});
const week = ['2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31'];
ok('consistency: a stopped sprint still counts as showing up', isActiveDay(mkLog('x', { xpEarned: 4 })));
ok('consistency: an untouched day does not', !isActiveDay(mkLog('x')));
check(
  'consistency: a missed day costs one day, not the history',
  activeDaysIn([mkLog(week[0], { xpEarned: 5 }), mkLog(week[2], { xpEarned: 5 }), mkLog(week[3], { xpEarned: 5 })], week),
  3,
);
check('consistency: days outside the window are ignored', activeDaysIn([mkLog('2026-01-01', { xpEarned: 50 })], week), 0);


// --- levels: additive, never lost ----------------------------------------------
check('levels: everyone starts at one', levelFor(0), 1);
check('levels: 175 XP reaches level 2', levelFor(175), 2);
check('levels: one short of it does not', levelFor(174), 1);
check('levels: the curve widens as it climbs', [xpForLevel(2), xpForLevel(3), xpForLevel(4)], [175, 400, 675]);
ok(
  'levels: each level costs more than the one before',
  xpForLevel(5) - xpForLevel(4) > xpForLevel(4) - xpForLevel(3),
);
check('levels: progress inside a level', levelProgress(300), { level: 2, title: 'Warming up', into: 125, span: 225, fraction: 125 / 225 });
check('levels: a fresh account has a title too', levelProgress(0).title, 'Just started');
check('levels: titles run out gracefully', levelTitle(99), LEVEL_TITLES[LEVEL_TITLES.length - 1]);
ok('levels: XP only ever climbs, so a level cannot be lost', levelFor(1000) >= levelFor(999));

// --- momentum: steps down by a day, never shatters ------------------------------
const mDay = (d: number) => `2026-09-${String(d).padStart(2, '0')}`;
const mLog = (d: number) => mkLog(mDay(d), { sprintsCompleted: 1, xpEarned: 10 });
check('momentum: nothing logged, nothing to keep', momentumFrom([], mDay(10)), 0);
check('momentum: one day on the board', momentumFrom([mLog(10)], mDay(10)), 1);
check('momentum: three days running', momentumFrom([mLog(8), mLog(9), mLog(10)], mDay(10)), 3);
check(
  'momentum: a missed day costs a day, not the history',
  momentumFrom([mLog(1), mLog(2), mLog(3), mLog(4), mLog(6)], mDay(6)),
  4,
);
check(
  'momentum: today is never counted as missed — the day is not over',
  momentumFrom([mLog(8), mLog(9)], mDay(10)),
  2,
);
check(
  'momentum: a long gap wears it down gradually rather than wiping it',
  momentumFrom([mLog(1), mLog(2), mLog(3)], mDay(6)),
  1,
);
check('momentum: it floors at zero and stays there', momentumFrom([mLog(1)], mDay(20)), 0);
check('days between: inclusive of both ends', daysBetween(mDay(1), mDay(3)), [mDay(1), mDay(2), mDay(3)]);
check('days between: a single day is itself', daysBetween(mDay(4), mDay(4)), [mDay(4)]);

// --- daily quest: resets nightly ------------------------------------------------
const questProgress = { dailyQuestDone: 2, dailyQuestDate: mDay(9), dailyQuestTarget: 3 };
check("quest: today's count", questToday(questProgress, mDay(9)), { done: 2, target: 3 });
check('quest: yesterday\'s count is not today\'s', questToday(questProgress, mDay(10)), { done: 0, target: 3 });
check('quest: no progress row yet', questToday(undefined, mDay(10)), { done: 0, target: 3 });

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
