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
| 2 | Focus view: steps, sprint goal, progress | not started |
| 3 | Active sprint + completion screen (closes the core loop) | not started |
| 4 | Gamification header: level ring, XP, momentum, daily quest | not started |
| 5 | Stats page | not started |
| 6 | Plan calendar | not started |
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
