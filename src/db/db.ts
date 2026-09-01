import Dexie, { type EntityTable } from 'dexie';
import type { Breakdown, Progress, Settings, Sprint, StatsLog, Step, Task } from './types';

export class SprintDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  steps!: EntityTable<Step, 'id'>;
  breakdowns!: EntityTable<Breakdown, 'id'>;
  sprints!: EntityTable<Sprint, 'id'>;
  statsLogs!: EntityTable<StatsLog, 'date'>;
  progress!: EntityTable<Progress, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor() {
    super('sprint');
    this.version(1).stores({
      tasks: '++id, status, priority, type, deadline, createdAt, completedAt',
      steps: '++id, taskId, order, done, [taskId+order]',
      breakdowns: '++id, &taskType',
      sprints: '++id, taskId, status, startedAt',
      statsLogs: '&date',
      progress: 'id',
      settings: 'id',
    });
  }
}

export const db = new SprintDB();
