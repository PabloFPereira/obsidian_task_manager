import type { MarkdownKanbanDocument, MarkdownSection, ParsedMarkdownTask } from "../../domain/models/MarkdownDocument";
import type { Task, TaskStatus } from "../../domain/models/Task";
import { slugify, stableFallbackTaskId } from "../../utils/id";
import {
  DUE_DATE_PATTERN,
  HEADING_PATTERN,
  isIgnoredSection,
  normalizeStatusTitle,
  parseTaskManagerMetadata,
  removeTaskManagerMetadata,
  TASK_LINE_PATTERN,
} from "./markdownFormat";

export interface ResolvedWikiLink {
  name: string;
  path?: string;
  isProject: boolean;
}

export type WikiLinkResolver = (linkText: string, sourcePath: string) => ResolvedWikiLink | undefined;

export class MarkdownKanbanParser {
  constructor(private readonly resolveWikiLink?: WikiLinkResolver) {}

  parse(path: string, content: string): MarkdownKanbanDocument {
    const normalizedContent = content.replace(/\r\n/g, "\n");
    const lines = normalizedContent.split("\n");
    const name = fileNameWithoutExtension(path);
    const id = slugify(path);
    const sections = this.parseSections(lines);
    const tasks = this.parseTasks(id, name, path, lines, sections);
    const unknownColumns = sections
      .filter((section) => !section.normalizedStatus && !isIgnoredSection(section.title))
      .map((section) => section.title);

    return {
      id,
      name,
      path,
      lines,
      sections,
      tasks,
      unknownColumns,
    };
  }

  private parseSections(lines: string[]): MarkdownSection[] {
    const sections: MarkdownSection[] = [];

    lines.forEach((line, index) => {
      const heading = line.match(HEADING_PATTERN);
      if (!heading) {
        return;
      }

      if (sections.length > 0) {
        sections[sections.length - 1].endLine = index - 1;
      }

      const title = heading[1].trim();
      sections.push({
        title,
        normalizedStatus: normalizeStatusTitle(title),
        startLine: index,
        endLine: lines.length - 1,
      });
    });

    return sections;
  }

  private parseTasks(
    kanbanId: string,
    kanbanName: string,
    path: string,
    lines: string[],
    sections: MarkdownSection[],
  ): ParsedMarkdownTask[] {
    const tasks: ParsedMarkdownTask[] = [];

    lines.forEach((line, index) => {
      const match = line.match(TASK_LINE_PATTERN);
      if (!match) {
        return;
      }

      const section = findSectionForLine(sections, index);
      if (section && isIgnoredSection(section.title)) {
        return;
      }

      const checked = match[2].toLowerCase() === "x";
      const body = match[3];
      const metadata = parseTaskManagerMetadata(body);
      const dueDate = body.match(DUE_DATE_PATTERN)?.[1];
      const status = metadata.status ?? section?.normalizedStatus ?? statusFromCheckbox(checked);
      const cleanName = extractTaskName(body);
      const wikiLinks = extractWikiLinks(cleanName).map((link) => this.resolveLink(link, path));
      const firstProjectLink = wikiLinks.find((link) => link.isProject);
      const firstNoteLink = wikiLinks.find((link) => !link.isProject);
      const id = metadata.id ?? stableFallbackTaskId(path, index);
      const createdAt = metadata.createdAt ?? metadata.updatedAt ?? new Date(0).toISOString();
      const updatedAt = metadata.updatedAt ?? createdAt;
      const projectName = metadata.projectName ?? firstProjectLink?.name;
      const projectPath = metadata.projectPath ?? firstProjectLink?.path;
      const relatedNoteName = metadata.relatedNoteName ?? firstNoteLink?.name;
      const relatedNotePath = metadata.relatedNotePath ?? firstNoteLink?.path;

      const task: Task = {
        id,
        name: cleanName,
        projectId: projectName ? slugify(projectName) : undefined,
        projectName,
        projectPath,
        relatedNoteName,
        relatedNotePath,
        priority: metadata.priority,
        size: metadata.size,
        status,
        dueDate,
        startedAt: metadata.startedAt,
        completedAt: metadata.completedAt,
        kanbanId,
        kanbanName,
        createdAt,
        updatedAt,
        sourcePath: path,
        sourceLine: index,
        sourceColumnTitle: section?.title ?? "",
        isFromUnknownColumn: Boolean(section && !section.normalizedStatus),
        hasPersistentId: Boolean(metadata.id),
      };

      tasks.push({ task, rawLine: line });
    });

    return tasks;
  }

  private resolveLink(linkText: string, sourcePath: string): ResolvedWikiLink {
    const resolved = this.resolveWikiLink?.(linkText, sourcePath);
    if (resolved) {
      return resolved;
    }

    return {
      name: linkText,
      isProject: false,
    };
  }
}

export function findSectionForLine(sections: MarkdownSection[], line: number): MarkdownSection | undefined {
  return sections.find((section) => section.startLine <= line && section.endLine >= line);
}

function statusFromCheckbox(checked: boolean): TaskStatus {
  return checked ? "done" : "backlog";
}

function extractTaskName(body: string): string {
  return removeTaskManagerMetadata(body)
    .replace(DUE_DATE_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractWikiLinks(value: string): string[] {
  const links: string[] = [];
  const pattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    const link = match[1]?.trim();
    if (link) {
      links.push(link);
    }
  }

  return links;
}

function fileNameWithoutExtension(path: string): string {
  return path.split("/").pop()?.replace(/\.md$/i, "") ?? path;
}
