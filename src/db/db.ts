import Dexie, { type EntityTable } from 'dexie';
import type { Breakdown, Sprint, StatsLog, Task } from './types';

export class SprintDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  breakdowns!: EntityTable<Breakdown, 'id'>;
  sprints!: EntityTable<Sprint, 'id'>;
  statsLogs!: EntityTable<StatsLog, 'date'>;

  constructor() {
    super('sprint');
    this.version(1).stores({
      tasks: '++id, status, type, deadline, urgency, createdAt, completedAt',
      breakdowns: '++id, &taskType',
      sprints: '++id, taskId, status, startedAt',
      statsLogs: '&date',
    });
  }
}

export const db = new SprintDB();
