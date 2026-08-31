# Sprint

An ADHD task-sprint app. Pick a task, get it broken into steps, run a timed
sprint, log it. Minimalist surface, powerful core — the cognitive load is meant
to land on the app, not on you.

Local-first PWA: React + Vite + Tailwind, IndexedDB via Dexie. No accounts, no
login, no backend, works offline, installs to the home screen.

## Running it

```bash
npm install
npm run dev        # dev server
npm test           # pure-logic tests (matching, sprint sizing, XP, ordering)
npm run build      # typecheck + production build, service worker included
npm run preview    # serve the built app
npm run icons      # regenerate the launcher PNGs from scripts/generate-icons.mjs
```

## The core loop

1. **Pick a task** — free-form, any task, any time. Nothing forces an order.
2. **Get a breakdown** — steps suggested from the task's type.
3. **Start a sprint** — a length is suggested from the task's type and weight,
   and is always editable.
4. **The sprint ends, or you stop it** — never a fail state. Stopping asks
   "resume later, or done for now?" and both answers keep the time you did.
5. **It's logged** — feeding XP, the consistency score and the trend charts.

## Three screens

`Now` is the landing view; the planning layer is one tap away, not in your face.

- **Now** — the current task card (breakdown, sprint length, start) plus the
  horizon strip.
- **Plan** — every active task grouped by when it is due.
- **Stats** — XP, level, consistency, and daily trend charts.

### Two rules the code enforces

**The horizon strip shows what is coming, never how far behind you are.** No
"behind" count, no overdue badge, no red on the Now screen. Schedule variance
lives in `PlanScreen` only, where the user went looking for it. A landing screen
that opens with how far behind you are is a landing screen you stop opening —
the exact failure this app exists to prevent.

**No day-streak counter.** One missed day should not zero out months of
progress. Instead there is a rolling consistency score — "active 5 of the last 7
days" — that dips by one and never shatters. A day counts if you showed up at
all: an abandoned sprint counts exactly like a finished one for consistency
(it earns less XP, but it is never nothing).

## How the breakdown system works

No AI, no network. `src/lib/templates.ts` holds starter breakdowns for common
task types. `src/lib/matching.ts` normalises a free-form title, folds synonyms
("tidy" → "clean", "bedroom" → "room"), and scores it against every template's
aliases with token coverage plus character-bigram similarity — so "tidy bedroom"
and "clean my room" land on the same steps, and anything unrecognised falls back
to a generic breakdown rather than guessing.

When you edit a suggested breakdown, your version is saved against that *task
type* and used instead of the generic template from then on. The library grows
into yours. (Edits to the generic fallback are not remembered — those steps
belong to one unmatched task, not to every unmatched task.)

AI assistance for genuinely novel tasks is a later add-on, not a dependency.

## Data model

`src/db/types.ts`, stored in IndexedDB:

- `Task` — title, type, priority, urgency, deadline, estimatedEffort, status, steps
- `Breakdown` — a task type's personal step list, once the user has edited one
- `Sprint` — taskId, plannedLength, actualLength, status, timestamps, XP
- `StatsLog` — one row per day: tasks completed, sprints completed, focus minutes, XP

`deadline`, `urgency` and `estimatedEffort` are carried from day one even though
V1 only sorts by them — V2's pacing engine needs them, and retrofitting fields
means migrating stored data.

## Phasing

**V1 (this)** — the core loop, breakdown templates with personal memory, XP and
consistency, and a deadline-sorted horizon strip with no pacing maths.

**V2** — the priority/urgency pacing engine: a suggested daily pace toward each
deadline, a calendar in Plan, ahead/behind status (in Plan only), and a horizon
strip enriched with the day's target.

## Layout

```
src/
  db/          Dexie schema, types, and every write the app makes
  lib/         pure logic — templates, matching, sprint sizing, XP, time
  components/  three screens, the sheets, and the charts
tests/         node tests for everything in lib/
scripts/       launcher icon generator
```

Charts are hand-rolled SVG against a palette validated for contrast and
colour-vision separation on this app's dark surface; each is a single series, so
the heading names it and only the endpoint is labelled. `Show numbers` on the
Stats screen exposes the same data as a table.
