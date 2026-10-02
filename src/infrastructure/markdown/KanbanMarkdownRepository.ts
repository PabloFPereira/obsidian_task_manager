import { App, normalizePath, TFile } from "obsidian";
import type { Kanban } from "../../domain/models/Kanban";
import type { MarkdownKanbanDocument } from "../../domain/models/MarkdownDocument";
import type { Task } from "../../domain/models/Task";
import type { TaskManagerSettings } from "../../settings/TaskManagerSettings";
import { MarkdownKanbanParser, type ResolvedWikiLink } from "./MarkdownKanbanParser";
import { MarkdownKanbanSerializer } from "./MarkdownKanbanSerializer";

export class KanbanMarkdownRepository {
  private readonly serializer = new MarkdownKanbanSerializer();

  constructor(
    private readonly app: App,
    private getSettings: () => TaskManagerSettings,
  ) {}

  async loadAll(): Promise<Kanban[]> {
    const files = this.getKanbanFiles();
    const kanbans = await Promise.all(files.map((file) => this.loadFile(file)));
    return kanbans.map((document) => ({
      id: document.id,
      name: document.name,
      path: document.path,
      tasks: document.tasks.map((task) => task.task),
      unknownColumns: document.unknownColumns,
    }));
  }

  async loadOne(path: string): Promise<Kanban | undefined> {
    const file = this.getFile(path);
    if (!file) {
      return undefined;
    }

    const document = await this.loadFile(file);
    return {
      id: document.id,
      name: document.name,
      path: document.path,
      tasks: document.tasks.map((task) => task.task),
      unknownColumns: document.unknownColumns,
    };
  }

  async createTask(task: Task): Promise<void> {
    const file = this.getFile(task.sourcePath);
    if (!file) {
      throw new Error(`Kanban file not found: ${task.sourcePath}`);
    }

    const document = await this.loadFile(file);
    const nextContent = this.serializer.createTask(document, task);
    await this.app.vault.modify(file, nextContent);
  }

  async updateTask(task: Task): Promise<void> {
    const file = this.getFile(task.sourcePath);
    if (!file) {
      throw new Error(`Kanban file not found: ${task.sourcePath}`);
    }

    const document = await this.loadFile(file);
    const nextContent = this.serializer.updateTask(document, task);
    await this.app.vault.modify(file, nextContent);
  }

  async deleteTask(task: Task): Promise<void> {
    const file = this.getFile(task.sourcePath);
    if (!file) {
      throw new Error(`Kanban file not found: ${task.sourcePath}`);
    }

    const document = await this.loadFile(file);
    const nextContent = this.serializer.deleteTask(document, task);
    await this.app.vault.modify(file, nextContent);
  }

  async moveTask(task: Task, targetTaskId: string | undefined, placement: "before" | "after"): Promise<void> {
    const file = this.getFile(task.sourcePath);
    if (!file) {
      throw new Error(`Kanban file not found: ${task.sourcePath}`);
    }

    const document = await this.loadFile(file);
    const nextContent = this.serializer.moveTask(document, task, targetTaskId, placement);
    await this.app.vault.modify(file, nextContent);
  }

  isKanbanPath(path: string): boolean {
    const normalized = normalizePath(path);
    const folder = normalizeFolder(this.getSettings().kanbanFolder);

    if (!normalized.toLowerCase().endsWith(".md")) {
      return false;
    }

    if (!normalized.startsWith(folder)) {
      return false;
    }

    return this.isIncluded(normalized);
  }

  private async loadFile(file: TFile): Promise<MarkdownKanbanDocument> {
    const content = await this.app.vault.read(file);
    const parser = new MarkdownKanbanParser((linkText, sourcePath) => this.resolveWikiLink(linkText, sourcePath));
    return parser.parse(file.path, content);
  }

  private resolveWikiLink(linkText: string, sourcePath: string): ResolvedWikiLink {
    const linkTarget = linkText.split("#")[0]?.trim() ?? linkText;
    const destination = this.app.metadataCache.getFirstLinkpathDest(linkTarget, sourcePath) ?? this.findMarkdownByBasename(linkTarget);

    if (!destination) {
      return {
        name: linkTarget,
        isProject: false,
      };
    }

    return {
      name: destination.basename,
      path: destination.path,
      isProject: isProjectPath(destination.path),
    };
  }

  private getKanbanFiles(): TFile[] {
    return this.app.vault
      .getMarkdownFiles()
      .filter((file) => this.isKanbanPath(file.path))
      .sort((a, b) => a.basename.localeCompare(b.basename));
  }

  private getFile(path: string): TFile | undefined {
    const abstractFile = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return abstractFile instanceof TFile ? abstractFile : undefined;
  }

  private findMarkdownByBasename(linkTarget: string): TFile | undefined {
    const normalizedTarget = linkTarget.toLowerCase();
    return this.app.vault
      .getMarkdownFiles()
      .find((file) => file.basename.toLowerCase() === normalizedTarget || file.path.replace(/\.md$/i, "").toLowerCase() === normalizedTarget);
  }

  private isIncluded(path: string): boolean {
    const settings = this.getSettings();
    const includePatterns = splitPatterns(settings.includeFiles);
    const excludePatterns = splitPatterns(settings.excludeFiles);
    const fileName = path.split("/").pop() ?? path;

    if (includePatterns.length > 0 && !includePatterns.some((pattern) => matchesPattern(fileName, pattern))) {
      return false;
    }

    return !excludePatterns.some((pattern) => matchesPattern(fileName, pattern));
  }
}

function isProjectPath(path: string): boolean {
  return normalizePath(path).toLowerCase().startsWith("projects/");
}

function normalizeFolder(folder: string): string {
  const normalized = normalizePath(folder.trim() || "Tasks");
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function splitPatterns(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchesPattern(fileName: string, pattern: string): boolean {
  if (pattern.includes("*")) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`, "i").test(fileName);
  }

  return fileName.toLowerCase().includes(pattern.toLowerCase());
}
