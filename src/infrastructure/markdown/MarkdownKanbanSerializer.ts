import type { MarkdownKanbanDocument } from "../../domain/models/MarkdownDocument";
import type { Task, TaskStatus } from "../../domain/models/Task";
import {
  HEADING_PATTERN,
  KANBAN_SETTINGS_PATTERN,
  normalizeStatusTitle,
  statusLabel,
  TASK_LINE_PATTERN,
  type TaskManagerMarkdownMetadata,
} from "./markdownFormat";
import { MarkdownKanbanParser } from "./MarkdownKanbanParser";

export class MarkdownKanbanSerializer {
  private readonly parser = new MarkdownKanbanParser();

  createTask(document: MarkdownKanbanDocument, task: Task): string {
    const lines = [...document.lines];
    this.insertTaskLineAtTop(lines, task.status, serializeTaskLine(task));
    return joinLines(lines);
  }

  updateTask(document: MarkdownKanbanDocument, task: Task): string {
    const lines = [...document.lines];
    const current = findTaskLine(document, task);
    const line = serializeTaskLine(task);

    if (!current) {
      this.insertTaskLine(lines, task.status, line);
      return joinLines(lines);
    }

    const preserveUnknownColumn = current.task.isFromUnknownColumn && current.task.status === task.status;
    const targetStatus = preserveUnknownColumn ? undefined : task.status;

    if (targetStatus && normalizeStatusTitle(current.task.sourceColumnTitle) !== targetStatus) {
      lines.splice(current.task.sourceLine, 1);
      this.insertTaskLine(lines, targetStatus, line);
      return joinLines(lines);
    }

    lines[current.task.sourceLine] = line;
    return joinLines(lines);
  }

  deleteTask(document: MarkdownKanbanDocument, task: Task): string {
    const lines = [...document.lines];
    const current = findTaskLine(document, task);

    if (!current) {
      return joinLines(lines);
    }

    lines.splice(current.task.sourceLine, 1);
    return joinLines(lines);
  }

  moveTask(document: MarkdownKanbanDocument, task: Task, targetTaskId: string | undefined, placement: "before" | "after"): string {
    const lines = [...document.lines];
    const current = findTaskLine(document, task);
    const target = targetTaskId ? findTaskById(document, targetTaskId) : undefined;
    const line = serializeTaskLine(task);

    if (!current) {
      this.insertTaskLine(lines, task.status, line);
      return joinLines(lines);
    }

    lines.splice(current.task.sourceLine, 1);

    if (target && target.task.sourcePath === task.sourcePath) {
      let insertAt = target.task.sourceLine;
      if (current.task.sourceLine < insertAt) {
        insertAt -= 1;
      }
      if (placement === "after") {
        insertAt += 1;
      }
      lines.splice(insertAt, 0, line);
      return joinLines(lines);
    }

    this.insertTaskLine(lines, task.status, line);
    return joinLines(lines);
  }

  private insertTaskLine(lines: string[], status: TaskStatus, line: string): void {
    const parsed = this.parser.parse("__draft__.md", joinLines(lines));
    const section = parsed.sections.find((item) => item.normalizedStatus === status);

    if (!section) {
      this.createSection(lines, status, line);
      return;
    }

    const insertAt = findSectionInsertIndex(lines, section.startLine, section.endLine);
    lines.splice(insertAt, 0, line);
  }

  private insertTaskLineAtTop(lines: string[], status: TaskStatus, line: string): void {
    const parsed = this.parser.parse("__draft__.md", joinLines(lines));
    const section = parsed.sections.find((item) => item.normalizedStatus === status);

    if (!section) {
      this.createSection(lines, status, line);
      return;
    }

    const insertAt = findSectionTopInsertIndex(lines, section.startLine, section.endLine);
    lines.splice(insertAt, 0, line);
  }

  private createSection(lines: string[], status: TaskStatus, line: string): void {
    const insertAt = findSafeAppendIndex(lines);
    const block = [`## ${statusLabel(status)}`, "", line, ""];

    if (insertAt > 0 && lines[insertAt - 1]?.trim()) {
      block.unshift("");
    }

    lines.splice(insertAt, 0, ...block);
  }
}

function findSectionTopInsertIndex(lines: string[], startLine: number, endLine: number): number {
  let insertAt = startLine + 1;

  while (insertAt <= endLine && !lines[insertAt]?.trim()) {
    insertAt += 1;
  }

  return insertAt;
}

export function serializeTaskLine(task: Task): string {
  const checkbox = task.status === "done" ? "x" : " ";
  const due = task.dueDate ? ` @{${task.dueDate}}` : "";
  const metadata: TaskManagerMarkdownMetadata = {
    id: task.id,
    status: task.status,
    projectName: task.projectName,
    projectPath: task.projectPath,
    relatedNoteName: task.relatedNoteName,
    relatedNotePath: task.relatedNotePath,
    priority: task.priority,
    size: task.size,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
  };
  const compactMetadata = removeUndefined(metadata);
  return `- [${checkbox}] ${sanitizeTaskName(task.name)}${due} %% task-manager: ${JSON.stringify(compactMetadata)} %%`;
}

function findTaskLine(document: MarkdownKanbanDocument, task: Task) {
  const byPersistentId = document.tasks.find((item) => item.task.hasPersistentId && item.task.id === task.id);
  if (byPersistentId) {
    return byPersistentId;
  }

  return document.tasks.find((item) => item.task.id === task.id || item.task.sourceLine === task.sourceLine);
}

function findTaskById(document: MarkdownKanbanDocument, taskId: string) {
  return document.tasks.find((item) => item.task.id === taskId);
}

function findSectionInsertIndex(lines: string[], startLine: number, endLine: number): number {
  let insertAt = endLine + 1;

  for (let index = endLine; index > startLine; index -= 1) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      insertAt = index;
      continue;
    }

    if (!TASK_LINE_PATTERN.test(line) && !HEADING_PATTERN.test(line) && line.trim().startsWith("**")) {
      insertAt = index + 1;
      break;
    }

    break;
  }

  return Math.max(insertAt, startLine + 1);
}

function findSafeAppendIndex(lines: string[]): number {
  const settingsIndex = lines.findIndex((line) => KANBAN_SETTINGS_PATTERN.test(line));
  const archiveIndex = lines.findIndex((line) => {
    const heading = line.match(HEADING_PATTERN);
    return heading ? heading[1].trim().toLowerCase() === "archive" : false;
  });
  const candidates = [settingsIndex, archiveIndex].filter((index) => index >= 0);

  if (candidates.length === 0) {
    return trimTrailingBlankLines(lines.length, lines);
  }

  return trimTrailingBlankLines(Math.min(...candidates), lines);
}

function trimTrailingBlankLines(index: number, lines: string[]): number {
  let nextIndex = index;

  while (nextIndex > 0 && !lines[nextIndex - 1]?.trim()) {
    nextIndex -= 1;
  }

  return nextIndex;
}

function sanitizeTaskName(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function removeUndefined(metadata: TaskManagerMarkdownMetadata): TaskManagerMarkdownMetadata {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined)) as TaskManagerMarkdownMetadata;
}

function joinLines(lines: string[]): string {
  return lines.join("\n");
}
