/**
 * Plain-node tests for the pure logic: matching, sprint sizing, XP and ordering.
 * Run with `npm test` — esbuild bundles this and node executes it, so there is
 * no test framework to keep in step with the app's toolchain.
 */
import { matchTemplate } from '../src/lib/matching';
import { suggestSprintLength, focusedMs, remainingMs, MIN_SPRINT, MAX_SPRINT } from '../src/lib/sprint';
import { consistency, isActiveDay, levelFor, levelProgress, sprintXp, taskXp } from '../src/lib/xp';
import { horizonOrder } from '../src/lib/horizon';
import { dayKey, daysUntil, dueLabel, formatClock, formatDuration, lastNDays } from '../src/lib/time';
import type { StatsLog, Task } from '../src/db/types';

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

function ok(name: string, condition: boolean) {
  check(name, condition, true);
}

// --- fuzzy task-type matching -------------------------------------------------
const MATCHES: [string, string][] = [
  ['tidy bedroom', 'clean-room'],
  ['clean my room', 'clean-room'],
  ['declutter the flat', 'clean-room'],
  ['write history essay', 'essay'],
  ['finish my dissertation intro', 'essay'],
  ['reply to emails', 'email'],
  ['clear inbox', 'email'],
  ['study session for exam', 'study'],
  ['revise biology', 'study'],
  ['do the washing up', 'dishes'],
  ['clean the kitchen', 'dishes'],
  ['put the washing on', 'laundry'],
  ['fold clothes', 'laundry'],
  ['call the dentist', 'call'],
  ['ring mum back', 'call'],
  ['do my taxes', 'admin'],
  ['renew passport form', 'admin'],
  ['fix the login bug', 'code'],
  ['go to the gym', 'exercise'],
  ['grocery shopping', 'errands'],
  ['pick up parcel', 'errands'],
  ['cook dinner', 'meal'],
  ['read chapter 3', 'reading'],
  ['plan the trip', 'planning'],
  ['job application for design role', 'job-application'],
  ['update my cv', 'job-application'],
  // Nothing recognisable falls back rather than guessing.
  ['water the plants', 'general'],
  ['xyzzy', 'general'],
  ['', 'general'],
];
for (const [title, expected] of MATCHES) {
  check(`match: ${title || '(empty)'}`, matchTemplate(title).template.key, expected);
}

// --- sprint length heuristic --------------------------------------------------
check('sprint: essay, normal weight', suggestSprintLength({ type: 'essay', priority: 2, estimatedEffort: 120 }), 25);
check('sprint: heavy work runs longer', suggestSprintLength({ type: 'essay', priority: 3, estimatedEffort: 120 }), 30);
check('sprint: light work runs shorter', suggestSprintLength({ type: 'essay', priority: 1, estimatedEffort: 120 }), 20);
check('sprint: never longer than the work left', suggestSprintLength({ type: 'essay', priority: 3, estimatedEffort: 10 }), 10);
check('sprint: unmatched type uses the general default', suggestSprintLength({ type: 'general', priority: 2, estimatedEffort: 45 }), 25);
const clamped = suggestSprintLength({ type: 'dishes', priority: 1, estimatedEffort: 1 });
ok('sprint: stays within bounds', clamped >= MIN_SPRINT && clamped <= MAX_SPRINT);

// --- sprint clock -------------------------------------------------------------
const t0 = 1_700_000_000_000;
check('clock: paused time is not focus time', focusedMs({ startedAt: t0, pausedMs: 60_000 }, t0 + 300_000), 240_000);
check('clock: an open pause still counts out', focusedMs({ startedAt: t0, pausedMs: 0, pausedAt: t0 + 100_000 }, t0 + 300_000), 100_000);
check('clock: remaining counts down from planned', remainingMs({ startedAt: t0, plannedLength: 25, pausedMs: 0 }, t0 + 60_000), 1_440_000);

// --- XP -----------------------------------------------------------------------
check('xp: a finished sprint', sprintXp(25, 2, 'completed'), 17);
ok('xp: heavier tasks pay more', sprintXp(25, 3, 'completed') > sprintXp(25, 1, 'completed'));
ok('xp: stopping early still pays', sprintXp(25, 2, 'scrapped') > 0);
ok('xp: finishing pays more than scrapping', sprintXp(25, 2, 'completed') > sprintXp(25, 2, 'scrapped'));
check('xp: no sprint is worth nothing', sprintXp(0.1, 1, 'scrapped'), 1);
check('xp: task bonus scales with size', taskXp({ priority: 2, estimatedEffort: 120 }), 46);
check('level: starts at 1', levelFor(0), 1);
check('level: 40 xp is level 2', levelFor(40), 2);
check('level: progress within a level', levelProgress(60), { level: 2, into: 20, span: 120, pct: 20 / 120 });

// --- consistency (the anti-streak) -------------------------------------------
const days = ['2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31'];
const log = (date: string, over: Partial<StatsLog> = {}): StatsLog => ({
  date,
  tasksCompleted: 0,
  sprintsCompleted: 0,
  focusMinutes: 0,
  xpEarned: 0,
  ...over,
});
check(
  'consistency: counts active days in the window',
  consistency([log('2026-08-25', { sprintsCompleted: 1 }), log('2026-08-31', { tasksCompleted: 1 })], 7, days),
  { activeDays: 2, windowDays: 7, score: 29 },
);
ok('consistency: an abandoned sprint still counts as showing up', isActiveDay(log('2026-08-31', { focusMinutes: 8 })));
ok('consistency: an untouched day does not', !isActiveDay(log('2026-08-31')));
check(
  'consistency: a missed day dips by one, it does not reset',
  consistency([log('2026-08-25', { focusMinutes: 5 }), log('2026-08-27', { focusMinutes: 5 })], 7, days).activeDays,
  2,
);
check('consistency: days outside the window are ignored', consistency([log('2026-08-01', { focusMinutes: 30 })], 7, days).activeDays, 0);

// --- horizon ordering ---------------------------------------------------------
const task = (over: Partial<Task>): Task => ({
  title: 'x',
  type: 'general',
  priority: 2,
  urgency: 2,
  estimatedEffort: 30,
  status: 'active',
  steps: [],
  createdAt: 0,
  ...over,
});
const day = 86_400_000;
const ordered = horizonOrder([
  task({ title: 'undated-urgent', urgency: 3, createdAt: 5 }),
  task({ title: 'later', deadline: t0 + 3 * day }),
  task({ title: 'undated-calm', urgency: 1, createdAt: 1 }),
  task({ title: 'sooner', deadline: t0 + day }),
]).map((t) => t.title);
check('horizon: deadlines first, then urgency', ordered, ['sooner', 'later', 'undated-urgent', 'undated-calm']);

// --- time helpers -------------------------------------------------------------
const noon = new Date(2026, 7, 31, 12, 0, 0).getTime();
check('time: day key is local', dayKey(noon), '2026-08-31');
check('time: window ends today', lastNDays(3, noon), ['2026-08-29', '2026-08-30', '2026-08-31']);
check('time: days until is whole days', daysUntil(noon + 2 * day, noon), 2);
check('time: due today', dueLabel(noon, noon), 'Today');
check('time: due tomorrow', dueLabel(noon + day, noon), 'Tomorrow');
check('time: a past deadline is stated plainly', dueLabel(noon - day, noon), 'Yesterday');
check('time: clock format', formatClock(65_000), '1:05');
check('time: durations read as words', [formatDuration(45), formatDuration(90), formatDuration(120)], ['45m', '1h 30m', '2h']);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
