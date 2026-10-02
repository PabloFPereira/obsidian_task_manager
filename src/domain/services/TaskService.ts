import type { DateAutomationOptions } from "../rules/taskRules";
import { applyStatusDateRules } from "../rules/taskRules";
import type { Task, TaskDraft, TaskStatus } from "../models/Task";
import { createId, slugify } from "../../utils/id";
import { nowIso } from "../../utils/date";

type TaskPatch = Partial<Omit<Task, "id" | "kanbanId" | "kanbanName" | "sourcePath">>;

export class TaskService {
  constructor(private readonly dateAutomation: DateAutomationOptions) {}

  createTask(draft: TaskDraft, kanbanName: string, sourcePath: string): Task {
    const now = nowIso();
    const project = normalizeOptionalName(draft.projectName);
    const relatedNote = normalizeOptionalName(draft.relatedNoteName);

    return {
      id: createId("task"),
      name: draft.name.trim(),
      projectId: project ? slugify(project) : undefined,
      projectName: project,
      projectPath: draft.projectPath,
      relatedNoteName: relatedNote,
      relatedNotePath: draft.relatedNotePath,
      priority: draft.priority,
      size: draft.size,
      status: draft.status ?? "backlog",
      dueDate: draft.dueDate,
      startedAt: undefined,
      completedAt: undefined,
      kanbanId: draft.kanbanId,
      kanbanName,
      createdAt: now,
      updatedAt: now,
      sourcePath,
      sourceLine: -1,
      sourceColumnTitle: "",
      isFromUnknownColumn: false,
      hasPersistentId: true,
    };
  }

  updateTask(task: Task, patch: TaskPatch): Task {
    const project = normalizeOptionalName(patchedValue(patch, "projectName", task.projectName));
    const relatedNote = normalizeOptionalName(patchedValue(patch, "relatedNoteName", task.relatedNoteName));
    const status = patch.status ?? task.status;
    const base: Task = {
      ...task,
      ...patch,
      id: task.hasPersistentId ? task.id : createId("task"),
      projectName: project,
      projectId: project ? slugify(project) : undefined,
      projectPath: project ? patchedValue(patch, "projectPath", task.projectPath) : undefined,
      relatedNoteName: relatedNote,
      relatedNotePath: relatedNote ? patchedValue(patch, "relatedNotePath", task.relatedNotePath) : undefined,
      status,
      updatedAt: nowIso(),
      hasPersistentId: true,
    };

    if (status !== task.status) {
      return applyStatusDateRules({ ...base, status: task.status }, status, base.updatedAt, this.dateAutomation);
    }

    return base;
  }

  changeStatus(task: Task, status: TaskStatus): Task {
    const persistentTask: Task = task.hasPersistentId
      ? task
      : {
          ...task,
          id: createId("task"),
          hasPersistentId: true,
        };
    return applyStatusDateRules(persistentTask, status, nowIso(), this.dateAutomation);
  }
}

function normalizeOptionalName(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function patchedValue<K extends keyof TaskPatch>(patch: TaskPatch, key: K, fallback: TaskPatch[K]): TaskPatch[K] {
  return Object.prototype.hasOwnProperty.call(patch, key) ? patch[key] : fallback;
}
