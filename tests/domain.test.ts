import { describe, expect, it } from "vitest";
import { ProgressService } from "../src/domain/services/ProgressService";
import { TaskService } from "../src/domain/services/TaskService";
import type { Task } from "../src/domain/models/Task";
import { isTaskOverdue } from "../src/domain/rules/taskRules";

describe("TaskService", () => {
  it("sets startedAt only when entering Doing for the first time", () => {
    const service = new TaskService({ setStartedAtOnDoing: true, setCompletedAtOnDone: true });
    const task = makeTask({ status: "to_do" });

    const updated = service.changeStatus(task, "doing");
    const second = service.changeStatus(updated, "doing");

    expect(updated.startedAt).toBeDefined();
    expect(second.startedAt).toBe(updated.startedAt);
  });

  it("sets completedAt when entering Done and clears it when leaving Done", () => {
    const service = new TaskService({ setStartedAtOnDoing: true, setCompletedAtOnDone: true });
    const task = makeTask({ status: "doing" });

    const updated = service.changeStatus(task, "done");
    const reopened = service.changeStatus(updated, "to_do");
    const doneAgain = service.changeStatus(reopened, "done");

    expect(updated.completedAt).toBeDefined();
    expect(reopened.completedAt).toBeUndefined();
    expect(doneAgain.completedAt).toBeDefined();
  });

  it("creates a persistent ID when saving a legacy task", () => {
    const service = new TaskService({ setStartedAtOnDoing: true, setCompletedAtOnDone: true });
    const task = makeTask({ id: "legacy_tasks-job-md_10", hasPersistentId: false });

    const updated = service.updateTask(task, { name: "Task with metadata" });

    expect(updated.id).not.toBe(task.id);
    expect(updated.id.startsWith("task_")).toBe(true);
    expect(updated.hasPersistentId).toBe(true);
  });

  it("clears project and related note when fields are emptied", () => {
    const service = new TaskService({ setStartedAtOnDoing: true, setCompletedAtOnDone: true });
    const task = makeTask({
      projectId: "lakeops",
      projectName: "LakeOps",
      projectPath: "Projects/LakeOps.md",
      relatedNoteName: "Como fiz",
      relatedNotePath: "Notes/Como fiz.md",
    });

    const updated = service.updateTask(task, {
      projectName: undefined,
      projectPath: undefined,
      relatedNoteName: undefined,
      relatedNotePath: undefined,
    });

    expect(updated.projectId).toBeUndefined();
    expect(updated.projectName).toBeUndefined();
    expect(updated.projectPath).toBeUndefined();
    expect(updated.relatedNoteName).toBeUndefined();
    expect(updated.relatedNotePath).toBeUndefined();
  });
});

describe("ProgressService", () => {
  it("calculates task and point progress", () => {
    const service = new ProgressService();
    const tasks = [
      makeTask({ id: "1", status: "done", size: 3, projectName: "LakeOps", projectId: "lakeops" }),
      makeTask({ id: "2", status: "done", size: 5, projectName: "LakeOps", projectId: "lakeops" }),
      makeTask({ id: "3", status: "doing", size: 8, projectName: "LakeOps", projectId: "lakeops" }),
      makeTask({ id: "4", status: "to_do", size: undefined, projectName: "LakeOps", projectId: "lakeops" }),
    ];

    const metrics = service.calculateProjectProgress(tasks, "lakeops");

    expect(metrics.totalTasks).toBe(4);
    expect(metrics.completedTasks).toBe(2);
    expect(metrics.taskProgressPercentage).toBe(50);
    expect(metrics.totalPoints).toBe(16);
    expect(metrics.completedPoints).toBe(8);
    expect(metrics.pointProgressPercentage).toBe(50);
  });
});

describe("Task due dates", () => {
  it("marks tasks overdue only when due date is past and status is not done", () => {
    expect(isTaskOverdue(makeTask({ dueDate: "2026-09-23", status: "to_do" }), "2026-09-24")).toBe(true);
    expect(isTaskOverdue(makeTask({ dueDate: "2026-09-24", status: "to_do" }), "2026-09-24")).toBe(false);
    expect(isTaskOverdue(makeTask({ dueDate: "2026-09-23", status: "done" }), "2026-09-24")).toBe(false);
  });
});

function makeTask(patch: Partial<Task> = {}): Task {
  return {
    id: "task_test",
    name: "Task test",
    status: "backlog",
    kanbanId: "tasks-job",
    kanbanName: "Tasks - Job",
    createdAt: "2026-09-24T10:00:00.000Z",
    updatedAt: "2026-09-24T10:00:00.000Z",
    sourcePath: "Tasks/Tasks - Job.md",
    sourceLine: 1,
    sourceColumnTitle: "Backlog",
    isFromUnknownColumn: false,
    hasPersistentId: true,
    ...patch,
  };
}
