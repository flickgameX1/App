/**
 * The full data model, built at Stage 0 including the fields no stage uses yet
 * — adding them later would mean migrating whatever is already in the user's
 * IndexedDB.
 */

/** What the eye sorts by. Owns the row colour: left border and dot. */
export type Priority = 'top' | 'second' | 'canWait';

/** User-selected at creation. One of the two axes of the XP formula. */
export type CognitiveLoad = 'easy' | 'moderate' | 'challenging' | 'impossible';

/**
 * Derived from the typed duration, never chosen directly. The other XP axis:
 * it sets the base pool, so a big task is worth a lot however many sprints it
 * ends up taking.
 */
export type TimeBucket = 'under30' | 'halfToHour' | 'oneToThree' | 'long';

export type TaskStatus = 'active' | 'done' | 'archived';

export interface Task {
  id?: number;
  title: string;
  /** Breakdown template key, e.g. 'clean-room'. */
  type: string;
  priority: Priority;
  cognitiveLoad: CognitiveLoad;
  /** Total minutes the user typed. Free text, not a preset. */
  estimatedMinutes: number;
  /** Derived from estimatedMinutes at write time; stored so stats stay stable. */
  timeBucket: TimeBucket;
  /** Preferred sprint length for this task, in minutes. */
  sprintLength: number;
  deadline?: number;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
}

/**
 * Steps are their own rows rather than a blob on the task: a sprint records
 * which ones it was for, and they are selectable in any order — nothing is
 * locked behind finishing an earlier one.
 */
export interface Step {
  id?: number;
  taskId: number;
  text: string;
  done: boolean;
  order: number;
}

/**
 * A personal breakdown for a task type. Rows here mean the user edited that
 * type's steps, and their version is used instead of the generic template.
 */
export interface Breakdown {
  id?: number;
  taskType: string;
  steps: string[];
  source: 'personal';
  updatedAt: number;
}

/** 'running' is the live sprint; the other three are how it ended. */
export type SprintStatus = 'running' | 'completed' | 'paused' | 'stopped';

export interface Sprint {
  id?: number;
  taskId: number;
  /** What this sprint is for, in the user's words. Editable free text. */
  goalText: string;
  /** The steps the goal was built from, when it came from the breakdown. */
  stepIds?: number[];
  plannedLength: number;
  /** Minutes actually focused, pauses excluded. */
  actualLength: number;
  status: SprintStatus;
  startedAt: number;
  endedAt?: number;
  /** Accumulated paused time in ms, so the clock stays honest across pauses. */
  pausedMs: number;
  pausedAt?: number;
  xpAwarded: number;
}

export interface StatsLog {
  /** YYYY-MM-DD in local time. Primary key. */
  date: string;
  tasksCompleted: number;
  sprintsCompleted: number;
  xpEarned: number;
  /** Active days in the rolling window as of this date. */
  consistencyWindow: number;
}

/**
 * The gamification state. Every field here only ever grows or dips by one —
 * nothing in the model can be taken away or reset to zero.
 */
export interface Progress {
  /** Single row. */
  id: 1;
  level: number;
  totalXp: number;
  momentumDays: number;
  dailyQuestTarget: number;
  dailyQuestDone: number;
  /** Which day dailyQuestDone belongs to, so it resets nightly and not sooner. */
  dailyQuestDate: string;
  /** Last day with any activity, for stepping momentum down by one, never to zero. */
  lastActiveDate?: string;
  badgesEarned: string[];
}

export interface Settings {
  /** Single row. */
  id: 1;
  activePaletteId: string;
  defaultSprintLength: number;
}
