/**
 * The sprint clock reads off the wall clock rather than counting ticks, so
 * locking the phone, backgrounding the app or reloading it mid-sprint all leave
 * the timer where it should be rather than where a paused interval left it.
 */
export interface ClockState {
  startedAt: number;
  plannedLength: number;
  /** Accumulated paused time in ms. */
  pausedMs: number;
  /** Set while paused. */
  pausedAt?: number;
  endedAt?: number;
}

/** Time actually spent focused, with paused stretches taken out. */
export function focusedMs(sprint: ClockState, now: number = Date.now()): number {
  const end = sprint.endedAt ?? now;
  const openPause = sprint.pausedAt ? end - sprint.pausedAt : 0;
  return Math.max(0, end - sprint.startedAt - sprint.pausedMs - openPause);
}

export function remainingMs(sprint: ClockState, now: number = Date.now()): number {
  return Math.max(0, sprint.plannedLength * 60_000 - focusedMs(sprint, now));
}

/** 0 to 1. Drives the ring, which is the one piece of motion the app signs with. */
export function sprintProgress(sprint: ClockState, now: number = Date.now()): number {
  const total = sprint.plannedLength * 60_000;
  if (total <= 0) return 1;
  return Math.min(1, focusedMs(sprint, now) / total);
}

/**
 * Focused minutes, capped at the planned length: if the app was closed when the
 * timer ran out, the wall clock kept going but the sprint did not.
 */
export function focusedMinutes(sprint: ClockState, now: number = Date.now()): number {
  const minutes = focusedMs(sprint, now) / 60_000;
  return Math.round(Math.min(sprint.plannedLength, minutes) * 10) / 10;
}
