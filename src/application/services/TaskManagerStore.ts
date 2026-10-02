import type { EventRef } from "obsidian";
import { App, debounce, Notice, TFile } from "obsidian";
import type { Kanban, TaskManagerSnapshot } from "../../domain/models/Kanban";
import type { Task, TaskDraft, TaskStatus } from "../../domain/models/Task";
import { ProgressService } from "../../domain/services/ProgressService";
import { TaskService } from "../../domain/services/TaskService";
import { KanbanMarkdownRepository } from "../../infrastructure/markdown/KanbanMarkdownRepository";
import type { TaskManagerSettings } from "../../settings/TaskManagerSettings";
import { nowIso } from "../../utils/date";

type SnapshotListener = (snapshot: TaskManagerSnapshot) => void;

export class TaskManagerStore {
  private kanbans: Kanban[] = [];
  private listeners = new Set<SnapshotListener>();
  private internalWrites = new Set<string>();
  private readonly repository: KanbanMarkdownRepository;
  private readonly progressService = new ProgressService();
  private readonly debouncedExternalReload: (path: string) => void;
  private eventRefs: EventRef[] = [];

  constructor(
    private readonly app: App,
    private getSettings: () => TaskManagerSettings,
  ) {
    this.repository = new KanbanMarkdownRepository(app, getSettings);
    this.debouncedExternalReload = debounce((path: string) => {
      void this.reloadFile(path);
    }, 250, true);
  }

  async start(): Promise<void> {
    await this.reloadAll();
    this.registerVaultEvents();
  }

  stop(): void {
    for (const ref of this.eventRefs) {
      this.app.vault.offref(ref);
    }

    this.eventRefs = [];
    this.listeners.clear();
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): TaskManagerSnapshot {
    const tasks = this.kanbans.flatMap((kanban) => kanban.tasks);
    return {
      kanbans: this.kanbans,
      tasks,
      loadedAt: nowIso(),
    };
  }

  async reloadAll(): Promise<void> {
    try {
      this.kanbans = await this.repository.loadAll();
      this.emit();
    } catch (error) {
      new Notice(`Task Manager: erro ao carregar Kanbans. ${errorMessage(error)}`);
    }
  }

  async reloadFile(path: string): Promise<void> {
    if (!this.repository.isKanbanPath(path)) {
      return;
    }

    try {
      const updated = await this.repository.loadOne(path);
      this.kanbans = updated
        ? replaceKanban(this.kanbans, updated)
        : this.kanbans.filter((kanban) => kanban.path !== path);
      this.emit();
    } catch (error) {
      new Notice(`Task Manager: erro ao atualizar ${path}. ${errorMessage(error)}`);
    }
  }

  async createTask(draft: TaskDraft): Promise<void> {
    const kanban = this.kanbans.find((item) => item.id === draft.kanbanId);
    if (!kanban) {
      throw new Error("Kanban not found.");
    }

    const task = this.taskService().createTask(draft, kanban.name, kanban.path);
    await this.write(kanban.path, () => this.repository.createTask(task));
    await this.reloadFile(kanban.path);
  }

  async saveTask(task: Task): Promise<void> {
    await this.write(task.sourcePath, () => this.repository.updateTask(task));
    await this.reloadFile(task.sourcePath);
  }

  async updateTask(task: Task, patch: Partial<Omit<Task, "id" | "kanbanId" | "kanbanName" | "sourcePath">>): Promise<void> {
    const updated = this.taskService().updateTask(task, patch);
    await this.saveTask(updated);
  }

  async changeStatus(task: Task, status: TaskStatus): Promise<void> {
    const updated = this.taskService().changeStatus(task, status);
    await this.saveTask(updated);
  }

  async moveTask(task: Task, status: TaskStatus, targetTaskId: string | undefined, placement: "before" | "after"): Promise<void> {
    const updated =
      task.status === status
        ? this.taskService().updateTask(task, { status })
        : this.taskService().changeStatus(task, status);
    await this.write(updated.sourcePath, () => this.repository.moveTask(updated, targetTaskId, placement));
    await this.reloadFile(updated.sourcePath);
  }

  async deleteTask(task: Task): Promise<void> {
    await this.write(task.sourcePath, () => this.repository.deleteTask(task));
    await this.reloadFile(task.sourcePath);
  }

  getProgressService(): ProgressService {
    return this.progressService;
  }

  private registerVaultEvents(): void {
    this.eventRefs.push(
      this.app.vault.on("modify", (file) => {
        if (!(file instanceof TFile) || !this.repository.isKanbanPath(file.path)) {
          return;
        }

        if (this.internalWrites.has(file.path)) {
          this.internalWrites.delete(file.path);
          return;
        }

        this.debouncedExternalReload(file.path);
      }),
    );

    this.eventRefs.push(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile && this.repository.isKanbanPath(file.path)) {
          void this.reloadAll();
        }
      }),
    );

    this.eventRefs.push(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile && this.repository.isKanbanPath(file.path)) {
          this.kanbans = this.kanbans.filter((kanban) => kanban.path !== file.path);
          this.emit();
        }
      }),
    );
  }

  private async write(path: string, action: () => Promise<void>): Promise<void> {
    this.internalWrites.add(path);

    try {
      await action();
    } catch (error) {
      this.internalWrites.delete(path);
      throw error;
    }
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private taskService(): TaskService {
    const settings = this.getSettings();
    return new TaskService({
      setStartedAtOnDoing: settings.autoStartDate,
      setCompletedAtOnDone: settings.autoDoneDate,
    });
  }
}

function replaceKanban(kanbans: Kanban[], updated: Kanban): Kanban[] {
  const exists = kanbans.some((kanban) => kanban.path === updated.path);
  const next = exists
    ? kanbans.map((kanban) => (kanban.path === updated.path ? updated : kanban))
    : [...kanbans, updated];
  return next.sort((a, b) => a.name.localeCompare(b.name));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
