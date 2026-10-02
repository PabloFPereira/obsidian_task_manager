import type { Task } from "./Task";

export interface Kanban {
  id: string;
  name: string;
  path: string;
  tasks: Task[];
  unknownColumns: string[];
}

export interface TaskManagerSnapshot {
  kanbans: Kanban[];
  tasks: Task[];
  loadedAt: string;
}
