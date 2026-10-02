import type { TaskPriority, TaskSize, TaskStatus } from "../../domain/models/Task";
import { TASK_PRIORITIES, TASK_SIZES, TASK_STATUSES } from "../../domain/models/Task";

export interface TaskManagerMarkdownMetadata {
  id?: string;
  status?: TaskStatus;
  projectName?: string;
  projectPath?: string;
  relatedNoteName?: string;
  relatedNotePath?: string;
  priority?: TaskPriority;
  size?: TaskSize;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export const HEADING_PATTERN = /^##\s+(.+?)\s*$/;
export const TASK_LINE_PATTERN = /^(\s*)-\s+\[( |x|X)\]\s+(.*)$/;
export const TASK_MANAGER_COMMENT_PATTERN = /%%\s*task-manager\s*:?\s*(\{.*?\})\s*%%/;
export const KANBAN_SETTINGS_PATTERN = /^%%\s*kanban:settings/;
export const DUE_DATE_PATTERN = /@\{(\d{4}-\d{2}-\d{2})\}/;

export function normalizeStatusTitle(title: string): TaskStatus | undefined {
  const normalized = normalizeComparable(title);

  if (normalized === "backlog") {
    return "backlog";
  }

  if (normalized === "to-do" || normalized === "to-do" || normalized === "todo" || normalized === "to-do") {
    return "to_do";
  }

  if (normalized === "to do" || normalized === "to_do") {
    return "to_do";
  }

  if (normalized === "doing") {
    return "doing";
  }

  if (normalized === "done" || normalized === "complete" || normalized === "completed") {
    return "done";
  }

  return undefined;
}

export function statusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((item) => item.id === status)?.label ?? status;
}

export function isIgnoredSection(title: string): boolean {
  const normalized = normalizeComparable(title);
  return normalized === "archive" || normalized === "archived";
}

export function parseTaskManagerMetadata(line: string): TaskManagerMarkdownMetadata {
  const match = line.match(TASK_MANAGER_COMMENT_PATTERN);

  if (!match) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(match[1]);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const record = parsed as Record<string, unknown>;
    return {
      id: readString(record.id),
      status: readStatus(record.status),
      projectName: readString(record.projectName ?? record.projeto ?? record.project),
      projectPath: readString(record.projectPath),
      relatedNoteName: readString(record.relatedNoteName ?? record.noteName ?? record.nota),
      relatedNotePath: readString(record.relatedNotePath ?? record.notePath),
      priority: readPriority(record.priority ?? record.prioridade),
      size: readSize(record.size ?? record.tamanho),
      createdAt: readString(record.createdAt ?? record.criado_em),
      updatedAt: readString(record.updatedAt ?? record.atualizado_em),
      startedAt: readString(record.startedAt ?? record.data_inicio),
      completedAt: readString(record.completedAt ?? record.data_termino),
    };
  } catch {
    return {};
  }
}

export function removeTaskManagerMetadata(line: string): string {
  return line.replace(TASK_MANAGER_COMMENT_PATTERN, "").trimEnd();
}

export function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStatus(value: unknown): TaskStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return TASK_STATUSES.some((status) => status.id === value) ? (value as TaskStatus) : undefined;
}

function readPriority(value: unknown): TaskPriority | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return TASK_PRIORITIES.some((priority) => priority.id === value) ? (value as TaskPriority) : undefined;
}

function readSize(value: unknown): TaskSize | undefined {
  const numberValue = typeof value === "number" ? value : Number(value);
  return TASK_SIZES.includes(numberValue as TaskSize) ? (numberValue as TaskSize) : undefined;
}
