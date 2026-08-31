export type TaskStatus = 'active' | 'done';

/** 1 = light, 2 = normal, 3 = heavy. Used for XP weighting and sprint sizing. */
export type Priority = 1 | 2 | 3;
/** 1 = whenever, 2 = soon, 3 = today. V1 only sorts by it; V2 paces with it. */
export type Urgency = 1 | 2 | 3;

export interface Step {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id?: number;
  title: string;
  /** Template key this task matched, e.g. 'clean-room'. */
  type: string;
  priority: Priority;
  urgency: Urgency;
  /** Epoch ms, optional. V1 sorts the horizon by it; V2 paces toward it. */
  deadline?: number;
  /** Rough total minutes of work. Feeds the V1 sprint-length heuristic. */
  estimatedEffort: number;
  status: TaskStatus;
  steps: Step[];
  createdAt: number;
  completedAt?: number;
}

/**
 * A personal breakdown for a task type. Generic templates live in code
 * (lib/templates.ts); a row here means the user edited that type's steps and
 * their version wins from then on.
 */
export interface Breakdown {
  id?: number;
  taskType: string;
  steps: string[];
  source: 'personal';
  updatedAt: number;
}

export type SprintStatus = 'running' | 'completed' | 'paused' | 'scrapped';

export interface Sprint {
  id?: number;
  taskId: number;
  /** Minutes the sprint was set to run for. */
  plannedLength: number;
  /** Minutes actually spent focused (pauses excluded). */
  actualLength: number;
  status: SprintStatus;
  startedAt: number;
  endedAt?: number;
  /** Accumulated paused time in ms, so the clock is honest across pauses. */
  pausedMs: number;
  pausedAt?: number;
  xpEarned: number;
}

export interface StatsLog {
  /** YYYY-MM-DD in local time. Primary key. */
  date: string;
  tasksCompleted: number;
  sprintsCompleted: number;
  focusMinutes: number;
  xpEarned: number;
}
