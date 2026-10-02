import type { Task, TaskPriority, TaskSize, TaskStatus } from "../models/Task";
import { TASK_PRIORITIES, TASK_SIZES } from "../models/Task";
import { todayIsoDate } from "../../utils/date";

export interface DateAutomationOptions {
  setStartedAtOnDoing: boolean;
  setCompletedAtOnDone: boolean;
}

export function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.some((priority) => priority.id === value);
}

export function isTaskSize(value: number): value is TaskSize {
  return TASK_SIZES.includes(value as TaskSize);
}

export function isTaskOverdue(task: Pick<Task, "dueDate" | "status">, today = todayIsoDate()): boolean {
  return Boolean(task.dueDate && task.dueDate < today && task.status !== "done");
}

export function applyStatusDateRules(
  task: Task,
  nextStatus: TaskStatus,
  now: string,
  options: DateAutomationOptions,
): Task {
  const updated: Task = {
    ...task,
    status: nextStatus,
    updatedAt: now,
  };

  if (task.status === "done" && nextStatus !== "done") {
    updated.completedAt = undefined;
  }

  if (nextStatus === "doing" && !updated.startedAt && options.setStartedAtOnDoing) {
    updated.startedAt = now;
  }

  if (nextStatus === "done" && !updated.completedAt && options.setCompletedAtOnDone) {
    updated.completedAt = now;
  }

  return updated;
}
