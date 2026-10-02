import { App, ButtonComponent, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import type { TaskManagerSnapshot } from "../domain/models/Kanban";
import type { Task, TaskPriority, TaskSize, TaskStatus } from "../domain/models/Task";
import { TASK_PRIORITIES, TASK_SIZES, TASK_STATUSES } from "../domain/models/Task";
import { fromDateTimeInputValue, toDateInputValue, toDateTimeInputValue } from "../utils/date";
import { installWikiLinkInputBehavior } from "../utils/wikiLinkInput";
import { ConfirmModal } from "./ConfirmModal";

interface TaskDetailsModalOptions {
  task: Task;
  snapshot: TaskManagerSnapshot;
  onSave: (task: Task, patch: Partial<Omit<Task, "id" | "kanbanId" | "kanbanName" | "sourcePath">>) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
}

export class TaskDetailsModal extends Modal {
  private selectedSize: TaskSize | undefined;

  constructor(
    app: App,
    private readonly options: TaskDetailsModalOptions,
  ) {
    super(app);
    this.selectedSize = options.task.size;
  }

  onOpen(): void {
    const { task, snapshot } = this.options;
    this.contentEl.empty();
    this.titleEl.setText("Task");

    const titleValues = {
      name: task.name,
      projectName: task.projectName ?? "",
      relatedNoteName: task.relatedNoteName ?? "",
      status: task.status,
      priority: task.priority ?? "",
      dueDate: toDateInputValue(task.dueDate),
      startedAt: toDateTimeInputValue(task.startedAt),
      completedAt: toDateTimeInputValue(task.completedAt),
    };

    const projectListId = `tm-projects-${task.id}`;
    const noteListId = `tm-notes-${task.id}`;
    this.createDatalist(projectListId, unique(snapshot.tasks.map((item) => item.projectName)));
    this.appendDatalistOptions(projectListId, this.getProjectNoteNames());
    this.createDatalist(noteListId, unique(snapshot.tasks.map((item) => item.relatedNoteName)));
    this.appendDatalistOptions(noteListId, this.getAllNoteNames());

    new Setting(this.contentEl).setName("Nome").addText((text) => {
      text.setValue(titleValues.name).onChange((value) => {
        titleValues.name = value;
      });
      text.inputEl.addClass("task-manager-modal-wide-input");
      installWikiLinkInputBehavior(this.app, text.inputEl);
    });

    new Setting(this.contentEl).setName("Projeto").addText((text) => {
      text.setValue(titleValues.projectName).onChange((value) => {
        titleValues.projectName = value;
      });
      text.inputEl.setAttr("list", projectListId);
      text.inputEl.addClass("task-manager-modal-wide-input");
      installWikiLinkInputBehavior(this.app, text.inputEl);
    });

    new Setting(this.contentEl).setName("Nota relacionada").addText((text) => {
      text.setValue(titleValues.relatedNoteName).onChange((value) => {
        titleValues.relatedNoteName = value;
      });
      text.inputEl.setAttr("list", noteListId);
      text.inputEl.addClass("task-manager-modal-wide-input");
      installWikiLinkInputBehavior(this.app, text.inputEl);
    });

    new Setting(this.contentEl).setName("Status").addDropdown((dropdown) => {
      for (const status of TASK_STATUSES) {
        dropdown.addOption(status.id, status.label);
      }

      dropdown.setValue(titleValues.status).onChange((value) => {
        titleValues.status = value as TaskStatus;
      });
    });

    new Setting(this.contentEl).setName("Prioridade").addDropdown((dropdown) => {
      dropdown.addOption("", "Sem prioridade");
      for (const priority of TASK_PRIORITIES) {
        dropdown.addOption(priority.id, priority.label);
      }

      dropdown.setValue(titleValues.priority).onChange((value) => {
        titleValues.priority = value;
      });
    });

    this.renderSizeSelector();

    new Setting(this.contentEl).setName("Prazo").addText((text) => {
      text.inputEl.type = "date";
      text.setValue(titleValues.dueDate).onChange((value) => {
        titleValues.dueDate = value;
      });
    });

    new Setting(this.contentEl).setName("Data de inicio").addText((text) => {
      text.inputEl.type = "datetime-local";
      text.setValue(titleValues.startedAt).onChange((value) => {
        titleValues.startedAt = value;
      });
    });

    new Setting(this.contentEl).setName("Data de termino").addText((text) => {
      text.inputEl.type = "datetime-local";
      text.setValue(titleValues.completedAt).onChange((value) => {
        titleValues.completedAt = value;
      });
    });

    const meta = this.contentEl.createDiv("task-manager-modal-meta");
    meta.createSpan({ text: `Kanban: ${task.kanbanName}` });
    meta.createSpan({ text: `ID: ${task.hasPersistentId ? task.id : "sera persistido ao salvar"}` });

    new Setting(this.contentEl)
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText("Excluir")
          .setWarning()
          .onClick(() => {
            new ConfirmModal(this.app, "Excluir task", `Excluir "${task.name}"?`, async () => {
              await this.options.onDelete(task);
              this.close();
            }).open();
          });
      })
      .addButton((button: ButtonComponent) => {
        button.setButtonText("Cancelar").onClick(() => this.close());
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText("Salvar")
          .setCta()
          .onClick(async () => {
            if (!titleValues.name.trim()) {
              new Notice("Task Manager: informe o nome da task.");
              return;
            }

            const projectReference = resolveNoteReference(this.app, titleValues.projectName, true);
            const relatedNoteReference = resolveNoteReference(this.app, titleValues.relatedNoteName, false);

            await this.options.onSave(task, {
              name: titleValues.name.trim(),
              projectName: projectReference?.name,
              projectPath: projectReference?.path,
              relatedNoteName: relatedNoteReference?.name ?? emptyToUndefined(titleValues.relatedNoteName),
              relatedNotePath: relatedNoteReference?.path,
              status: titleValues.status,
              priority: emptyToUndefined(titleValues.priority) as TaskPriority | undefined,
              size: this.selectedSize,
              dueDate: emptyToUndefined(titleValues.dueDate),
              startedAt: fromDateTimeInputValue(titleValues.startedAt),
              completedAt: fromDateTimeInputValue(titleValues.completedAt),
            });
            this.close();
          });
      });
  }

  private renderSizeSelector(): void {
    const setting = new Setting(this.contentEl).setName("Tamanho");
    const container = setting.controlEl.createDiv("task-manager-size-picker");

    const clearButton = container.createEl("button", {
      cls: "clickable-icon task-manager-size-button",
      text: "Sem",
      attr: { type: "button" },
    });
    clearButton.toggleClass("is-active", !this.selectedSize);
    clearButton.addEventListener("click", () => {
      this.selectedSize = undefined;
      this.refreshSizeButtons(container);
    });

    for (const size of TASK_SIZES) {
      const button = container.createEl("button", {
        cls: "clickable-icon task-manager-size-button",
        text: String(size),
        attr: { type: "button" },
      });
      button.dataset.size = String(size);
      button.toggleClass("is-active", this.selectedSize === size);
      button.addEventListener("click", () => {
        this.selectedSize = size;
        this.refreshSizeButtons(container);
      });
    }
  }

  private refreshSizeButtons(container: HTMLElement): void {
    for (const button of Array.from(container.querySelectorAll<HTMLButtonElement>(".task-manager-size-button"))) {
      const value = button.dataset.size ? Number(button.dataset.size) : undefined;
      button.toggleClass("is-active", value === this.selectedSize);
      if (!value) {
        button.toggleClass("is-active", !this.selectedSize);
      }
    }
  }

  private createDatalist(id: string, values: string[]): void {
    const datalist = this.contentEl.createEl("datalist", { attr: { id } });
    for (const value of values) {
      datalist.createEl("option", { attr: { value } });
    }
  }

  private appendDatalistOptions(id: string, values: string[]): void {
    const datalist = this.contentEl.querySelector<HTMLDataListElement>(`#${id}`);
    if (!datalist) {
      return;
    }

    const existing = new Set(Array.from(datalist.options).map((option) => option.value));
    for (const value of values) {
      if (!existing.has(value)) {
        datalist.createEl("option", { attr: { value } });
      }
    }
  }

  private getProjectNoteNames(): string[] {
    return this.app.vault
      .getMarkdownFiles()
      .filter((file) => isProjectPath(file.path))
      .map((file) => file.basename)
      .sort((a, b) => a.localeCompare(b));
  }

  private getAllNoteNames(): string[] {
    return this.app.vault
      .getMarkdownFiles()
      .map((file) => file.basename)
      .sort((a, b) => a.localeCompare(b));
  }
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b));
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

interface NoteReference {
  name: string;
  path: string;
}

function resolveNoteReference(app: App, value: string, projectsOnly: boolean): NoteReference | undefined {
  const linkTarget = normalizeReferenceValue(value);
  if (!linkTarget) {
    return undefined;
  }

  const direct = app.metadataCache.getFirstLinkpathDest(linkTarget, "");
  const file = direct ?? findMarkdownByName(app, linkTarget);

  if (!(file instanceof TFile)) {
    return undefined;
  }

  if (projectsOnly && !isProjectPath(file.path)) {
    return undefined;
  }

  return {
    name: file.basename,
    path: file.path,
  };
}

function normalizeReferenceValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const wikiMatch = trimmed.match(/^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]$/);
  return (wikiMatch?.[1] ?? trimmed).trim();
}

function findMarkdownByName(app: App, value: string): TFile | undefined {
  const normalized = value.toLowerCase();
  return app.vault
    .getMarkdownFiles()
    .find((file) => file.basename.toLowerCase() === normalized || file.path.replace(/\.md$/i, "").toLowerCase() === normalized);
}

function isProjectPath(path: string): boolean {
  return normalizePath(path).toLowerCase().startsWith("projects/");
}
