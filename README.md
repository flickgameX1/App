# Sprint

An ADHD task-sprint app. Pick a task, choose what this sprint is actually for,
run the timer, log it. Minimalist surface, powerful core — the cognitive load is
meant to land on the app, not on you.

Local-first PWA: React + Vite + Tailwind, IndexedDB via Dexie. No accounts, no
login, no backend, works offline, installs to the home screen.

## Build status

Built in stages; each stage lands and is confirmed before the next starts. Tabs
for stages not yet reached are empty placeholders, not half-working screens.

| Stage | Scope | State |
|---|---|---|
| 0 | Scaffold: palette token system + the full Dexie data model | **done** |
| 1 | Now list view + task creation flow | **done** |
| 2 | Focus view: steps, sprint goal, progress | **done** |
| 3 | Active sprint + completion screen (closes the core loop) | **done** |
| 4 | Gamification header: level ring, XP, momentum, daily quest | **done** |
| 5 | Stats page | **done** |
| 6 | Plan calendar | **done** |
| 7 | Polish: remaining palettes, badges, animation | not started |

## Running it

```bash
npm install
npm run dev        # dev server
npm test           # data layer, derived fields, palettes, breakdown matching
npm run build      # typecheck + production build, service worker included
npm run preview    # serve the built app
npm run icons      # regenerate the launcher PNGs
```

## Palette tokens

Every colour in the UI derives from the active palette; nothing hardcodes a hex.
Token values live in `src/index.css` under `[data-palette='…']` blocks, the
registry in `src/lib/palettes.ts`, and the active one is stamped on the root
element from `Settings.activePaletteId` — so a theme change is one attribute.

Each palette defines `bg`, `surface`, `text`, `muted`, `dim`, `accent`, `reward`,
`p1`/`p2`/`p3` and `line`. Four ship: **Ember** (default), **Neon**, **Forest**,
and **Paper**, a light theme for light-sensitivity.

`reward` is reserved for XP and levels and is never used decoratively. Priority
owns the row colour (`p1`/`p2`/`p3`); cognitive load stays a neutral text chip,
so one visual channel never carries two variables.

## Data model

`src/db/types.ts`, all of it built at Stage 0 — including the fields no stage
uses yet, since adding them later would mean migrating live user data.

- `Task` — title, type, priority, cognitiveLoad, estimatedMinutes, timeBucket
  (derived), sprintLength, deadline, status, timestamps
- `Step` — its own row per task, with an explicit order; selectable in any order,
  nothing locked behind an earlier step
- `Breakdown` — a task type's personal step list, once the user has edited one
- `Sprint` — goalText (free text), the stepIds it came from, planned/actual
  length, status, timestamps, XP awarded
- `StatsLog` — one row per day: tasks, sprints, XP, consistency window
- `Progress` — level, totalXp, momentum, daily quest, badges
- `Settings` — active palette, default sprint length

## XP

Two axes, both fixed at creation. **Time bucket** (derived from the typed
duration, never chosen) sets the base pool; **cognitive load** (user-selected)
multiplies it. Sprint count plays no part — chunking a task into more sprints
must not inflate its worth.

| bucket | base | | load | × |
|---|---|---|---|---|
| under 30m | 20 | | easy | 1.0 |
| 30m–1h | 45 | | moderate | 1.4 |
| 1–3h | 100 | | challenging | 1.9 |
| 3h+ | 220 | | impossible | 2.5 |

So a short easy job is 20 XP and a long one you've been avoiding for months is
550. Stopping a task part-way pays `total × (sprints done / sprints planned)` —
the remainder is forfeited, the work already put in never is.

## Plan

A month grid as a density map with the agenda as the content. Cells carry
priority-coloured dots, one per task due that day, so the shape of a week reads
without processing any text; today is marked in the accent colour. Tapping a day
fills the agenda below it. A month/week toggle sits in the header for anyone who
finds the month grid too wide.

**The pace block is the only place schedule variance appears** — and even here
it is the target ahead, never the debt behind: "2 sprints a day hits Sep 11".
Falling behind changes the number and turns it amber; it never produces a
deficit count and never turns red. `warn` is its own palette token so it can be
amber without borrowing from priority or from `reward`.

### The horizon strip

On the Now screen, below the list: a glanceable band of what's coming, sorted
chronologically — priority still reads off the dot, but a top-priority task due
in a fortnight is not what's coming next. It shows what's coming and nothing
else. No counts, no badges, no amber, no variance of any kind; that lives in
Plan, where the user chose to look at it.

## Stats

Total XP as the headline, then the consistency score — **active N of the last 7
days**, a rolling count that dips by one and never shatters — then completions
and focused time, then two charts:

- **Total XP over the last 30 days.** A growth curve that starts at whatever was
  earned before the window rather than restarting from zero, with a crosshair
  and tooltip; one series, so the heading names it and no legend box is needed.
- **XP by how hard it was.** Where the XP came from, across the four cognitive
  load tiers. Bar length is the encoding and every bar wears the same hue: a
  lightness ramp keyed to the tier would restate the ordering the labels already
  carry, and its palest step drops under the contrast floor on the light theme.

A **Show numbers** toggle exposes the same data as a table, so nothing is gated
behind reading a chart. Chart colours are palette tokens, so both charts follow
the active theme; the reward hue clears 3:1 on every palette's surface.

## The gamification layer

Sits above the task list: a level ring with the level number inside, the level's
title, an XP bar to the next level, momentum, and the daily quest.

**Every mechanic is additive.** XP and levels only climb. **Momentum** replaces
the streak — an active day adds one, a missed day costs one, and today is never
counted as missed because the day isn't over. Missing Tuesday costs a day, not
the history. The **daily quest** resets nightly to a fresh target rather than
recording a loss; hitting the target is a win, and hitting one still counts as
showing up. There is no losable currency, no decay to zero, no broken-streak
screen. The moment an app can punish you, opening it becomes risky and avoidance
wins.

Levels widen as they climb — 175 XP to level 2, then 225, then 275 — and each
carries a name, because "steady builder" is something to be where "level 4" is
only something to have.

## The sprint loop

Starting a sprint hands the screen over to the timer: the ring is the hero and
the only motion the app signs with, the task title shrinks to a whisper, the
goal is the only content, and XP, levels and stats are all hidden for the
duration — during a sprint there is nothing to watch instead of working.

Three ways out, none of them a failure: **Goal done**, **Pause**, and **Stop
here**, which asks only whether you're resuming later or done for now. Every
ending lands on the payoff screen, where the XP counts up and you're asked
whether the goal got done — "not yet" leaves the step available and costs
nothing.

A finished sprint banks its share of the task's XP; one cut short banks the
share of that sprint actually spent focused, so showing up always pays
something. The running total is capped at the task's own worth, and finishing
the task pays out whatever the sprints left on the table — so the XP earned
lands exactly on what the task was worth, and stopping early forfeits only the
remainder.

The clock reads off the wall clock, so locking the phone, backgrounding the app
or reloading mid-sprint all leave the timer where it should be. Only one sprint
can run at a time: one left running by another tab is closed out as stopped
rather than orphaned, keeping the time it holds.

## Sprint goals

The app never walks you through a checklist. In the focus view the breakdown is
a set of **options**: tap any of them, in any order, and the picked steps become
the sprint's goal — a single line of free text you can rewrite entirely. Picking
more steps takes the goal back over; typing your own keeps it until you do.
Nothing is locked behind finishing an earlier step, because the piece you can
actually face right now often isn't the next one in sequence.

## The breakdown system

No AI, no network. `src/lib/templates.ts` holds starter breakdowns for common
task types. `src/lib/matching.ts` normalises a free-form title, folds synonyms
("tidy" → "clean", "bedroom" → "room"), and scores it against every template's
aliases with token coverage plus character-bigram similarity — so "tidy bedroom"
and "clean my room" land on the same steps, and anything unrecognised falls back
to a generic breakdown rather than guessing. Edited breakdowns are saved as the
user's version of that task type.

## Layout

```
src/db/          Dexie schema, the data model, first-run seed
src/lib/         pure logic — palettes, buckets, templates, matching, time
tests/           node tests for the data layer and everything in lib/
scripts/         launcher icon generator
```
