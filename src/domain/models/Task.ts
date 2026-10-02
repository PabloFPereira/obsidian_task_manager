export type TaskStatus = "backlog" | "to_do" | "doing" | "done";

export type TaskPriority = "baixa" | "media" | "alta" | "critica";

export type TaskSize = 1 | 2 | 3 | 5 | 8 | 13 | 21;

export interface Task {
  id: string;
  name: string;
  projectId?: string;
  projectName?: string;
  projectPath?: string;
  relatedNoteName?: string;
  relatedNotePath?: string;
  priority?: TaskPriority;
  size?: TaskSize;
  status: TaskStatus;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  kanbanId: string;
  kanbanName: string;
  createdAt: string;
  updatedAt: string;
  sourcePath: string;
  sourceLine: number;
  sourceColumnTitle: string;
  isFromUnknownColumn: boolean;
  hasPersistentId: boolean;
}

export interface TaskDraft {
  name: string;
  kanbanId: string;
  status?: TaskStatus;
  projectName?: string;
  projectPath?: string;
  relatedNoteName?: string;
  relatedNotePath?: string;
  priority?: TaskPriority;
  size?: TaskSize;
  dueDate?: string;
}

export const TASK_STATUSES: ReadonlyArray<{ id: TaskStatus; label: string }> = [
  { id: "backlog", label: "Backlog" },
  { id: "to_do", label: "To Do" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
];

export const TASK_PRIORITIES: ReadonlyArray<{ id: TaskPriority; label: string }> = [
  { id: "baixa", label: "Baixa" },
  { id: "media", label: "Media" },
  { id: "alta", label: "Alta" },
  { id: "critica", label: "Critica" },
];

export const TASK_SIZES: ReadonlyArray<TaskSize> = [1, 2, 3, 5, 8, 13, 21];
