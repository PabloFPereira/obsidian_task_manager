import type { ProgressMetrics } from "../models/ProgressMetrics";
import type { Project } from "../models/Project";
import type { Task } from "../models/Task";
import { isTaskOverdue } from "../rules/taskRules";
import { slugify } from "../../utils/id";

export class ProgressService {
  getProjects(tasks: Task[]): Project[] {
    const projects = new Map<string, Project>();

    for (const task of tasks) {
      if (!task.projectName) {
        continue;
      }

      const id = task.projectId ?? slugify(task.projectName);
      projects.set(id, { id, name: task.projectName });
    }

    return Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  calculate(tasks: Task[]): ProgressMetrics {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === "done").length;
    const pointTasks = tasks.filter((task) => typeof task.size === "number");
    const totalPoints = pointTasks.reduce((sum, task) => sum + (task.size ?? 0), 0);
    const completedPoints = pointTasks
      .filter((task) => task.status === "done")
      .reduce((sum, task) => sum + (task.size ?? 0), 0);

    return {
      totalTasks,
      completedTasks,
      taskProgressPercentage: percentage(completedTasks, totalTasks),
      totalPoints,
      completedPoints,
      pointProgressPercentage: percentage(completedPoints, totalPoints),
    };
  }

  calculateProjectProgress(tasks: Task[], projectId: string): ProgressMetrics {
    return this.calculate(tasks.filter((task) => task.projectId === projectId));
  }

  getOverdueTasks(tasks: Task[]): Task[] {
    return tasks.filter((task) => isTaskOverdue(task));
  }

  getStatusCounts(tasks: Task[]): Record<Task["status"], number> {
    return {
      backlog: tasks.filter((task) => task.status === "backlog").length,
      to_do: tasks.filter((task) => task.status === "to_do").length,
      doing: tasks.filter((task) => task.status === "doing").length,
      done: tasks.filter((task) => task.status === "done").length,
    };
  }
}

function percentage(done: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((done / total) * 100);
}
