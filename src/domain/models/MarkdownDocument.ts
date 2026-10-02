import type { Task, TaskStatus } from "./Task";

export interface MarkdownSection {
  title: string;
  normalizedStatus?: TaskStatus;
  startLine: number;
  endLine: number;
}

export interface ParsedMarkdownTask {
  task: Task;
  rawLine: string;
}

export interface MarkdownKanbanDocument {
  id: string;
  name: string;
  path: string;
  lines: string[];
  sections: MarkdownSection[];
  tasks: ParsedMarkdownTask[];
  unknownColumns: string[];
}
