import { ItemView, Menu, Notice, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import type { TaskManagerStore } from "../application/services/TaskManagerStore";
import type { Kanban, TaskManagerSnapshot } from "../domain/models/Kanban";
import type { Project } from "../domain/models/Project";
import type { ProgressMetrics } from "../domain/models/ProgressMetrics";
import type { Task, TaskStatus } from "../domain/models/Task";
import { TASK_STATUSES } from "../domain/models/Task";
import type { TaskManagerSettings } from "../settings/TaskManagerSettings";
import { formatDate } from "../utils/date";
import { installWikiLinkInputBehavior } from "../utils/wikiLinkInput";
import { ConfirmModal } from "../modals/ConfirmModal";
import { TaskDetailsModal } from "../modals/TaskDetailsModal";

export const TASK_MANAGER_VIEW_TYPE = "kanban-task-manager-view";

type MainTab = "kanban" | "projects" | "dashboard";
type ProjectFilterId = "all" | "__none__" | string;
type TaskDateField = "dueDate" | "startedAt" | "completedAt";
type SortField = "manual" | TaskDateField;
type SortDirection = "asc" | "desc";
type DashboardDateField = "startedAt" | "completedAt";
type DashboardRange = "all" | "7" | "30" | "90";

const NO_PROJECT_FILTER = "__none__";

export class TaskManagerView extends ItemView {
  private snapshot: TaskManagerSnapshot = { kanbans: [], tasks: [], loadedAt: "" };
  private unsubscribe: (() => void) | undefined;
  private activeMainTab: MainTab = "kanban";
  private activeKanbanId = "all";
  private activeProjectFilterId: ProjectFilterId = "all";
  private selectedProjectId: string | undefined;
  private taskSearchQuery = "";
  private sortField: SortField = "manual";
  private sortDirection: SortDirection = "asc";
  private doneCompact = false;
  private dashboardDateField: DashboardDateField = "completedAt";
  private dashboardRange: DashboardRange = "30";

  constructor(
    leaf: WorkspaceLeaf,
    private readonly store: TaskManagerStore,
    private readonly getSettings: () => TaskManagerSettings,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return TASK_MANAGER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Task Manager";
  }

  getIcon(): string {
    return "list-checks";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("task-manager-view");
    this.unsubscribe = this.store.subscribe((snapshot) => {
      this.snapshot = snapshot;
      this.ensureValidSelection();
      this.render();
    });
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
  }

  private render(): void {
    this.ensureValidSelection();
    this.contentEl.empty();

    const shell = this.contentEl.createDiv("task-manager-shell");
    const header = shell.createDiv("task-manager-header");
    header.createEl("h2", { text: "Task Manager" });

    const reloadButton = header.createEl("button", {
      cls: "clickable-icon task-manager-icon-button",
      attr: { "aria-label": "Recarregar", type: "button" },
    });
    setIcon(reloadButton, "refresh-cw");
    reloadButton.addEventListener("click", () => {
      void this.store.reloadAll();
    });

    this.renderTopBar(shell);

    if (this.activeMainTab === "kanban") {
      this.renderKanban(shell);
      return;
    }

    if (this.activeMainTab === "projects") {
      this.renderProjects(shell);
      return;
    }

    this.renderDashboard(shell);
  }

  private renderTopBar(shell: HTMLElement): void {
    const toolbar = shell.createDiv("task-manager-toolbar");
    const topbar = toolbar.createDiv("task-manager-topbar");
    const tabs = topbar.createDiv("task-manager-tabs");
    this.createTabButton(tabs, "Kanban", this.activeMainTab === "kanban", () => {
      this.activeMainTab = "kanban";
      this.render();
    });
    this.createTabButton(tabs, "Projetos", this.activeMainTab === "projects", () => {
      this.activeMainTab = "projects";
      this.render();
    });
    this.createTabButton(tabs, "Dashboard", this.activeMainTab === "dashboard", () => {
      this.activeMainTab = "dashboard";
      this.render();
    });

    const filters = topbar.createDiv("task-manager-global-filters");
    this.renderKanbanScopeSelect(filters);
    this.renderProjectScopeSelect(filters);

    if (this.activeMainTab === "kanban") {
      this.renderKanbanControls(toolbar);
    }

    if (this.activeMainTab === "dashboard") {
      this.renderDashboardControls(toolbar);
    }
  }

  private renderKanbanScopeSelect(container: HTMLElement): void {
    const scope = container.createDiv("task-manager-scope");
    scope.createSpan({ text: "Kanban" });
    const select = scope.createEl("select", {
      cls: "dropdown task-manager-scope-select",
      attr: { "aria-label": "Filtrar por Kanban" },
    });
    select.createEl("option", { text: "Todos", value: "all" });

    for (const kanban of this.snapshot.kanbans) {
      select.createEl("option", { text: kanban.name, value: kanban.id });
    }

    select.value = this.activeKanbanId;
    select.addEventListener("change", () => {
      this.activeKanbanId = select.value;
      this.selectedProjectId = undefined;
      this.render();
    });
  }

  private renderProjectScopeSelect(container: HTMLElement): void {
    const scope = container.createDiv("task-manager-scope");
    scope.createSpan({ text: "Projeto" });
    const select = scope.createEl("select", {
      cls: "dropdown task-manager-scope-select",
      attr: { "aria-label": "Filtrar por Projeto" },
    });
    select.createEl("option", { text: "Todos", value: "all" });

    const kanbanScopedTasks = this.getKanbanScopedTasks();
    const projects = this.store.getProgressService().getProjects(kanbanScopedTasks);
    for (const project of projects) {
      select.createEl("option", { text: project.name, value: project.id });
    }

    if (kanbanScopedTasks.some((task) => !task.projectId)) {
      select.createEl("option", { text: "Sem projeto", value: NO_PROJECT_FILTER });
    }

    select.value = this.activeProjectFilterId;
    select.addEventListener("change", () => {
      this.activeProjectFilterId = select.value as ProjectFilterId;
      this.selectedProjectId = undefined;
      this.render();
    });
  }

  private renderKanban(shell: HTMLElement): void {
    if (this.snapshot.kanbans.length === 0) {
      shell.createDiv({ cls: "task-manager-empty", text: "Nenhum Kanban encontrado na pasta configurada." });
      return;
    }

    const visibleTasks = this.getVisibleTasks();
    const board = shell.createDiv("task-manager-board");

    for (const status of TASK_STATUSES) {
      const columnTasks = this.getOrderedColumnTasks(visibleTasks.filter((task) => task.status === status.id));
      const column = board.createDiv("task-manager-column");
      column.dataset.status = status.id;
      this.attachDropTarget(column, status.id);

      const header = column.createDiv("task-manager-column-header");
      header.createEl("span", { text: status.label.toUpperCase() });
      header.createEl("span", { cls: "task-manager-count", text: String(columnTasks.length) });

      if (status.id === "done") {
        const toggleButton = header.createEl("button", {
          cls: "clickable-icon task-manager-icon-button",
          attr: {
            "aria-label": this.doneCompact ? "Expandir Done" : "Minimizar Done",
            type: "button",
          },
        });
        setIcon(toggleButton, this.doneCompact ? "maximize-2" : "minimize-2");
        toggleButton.addEventListener("click", (event) => {
          event.stopPropagation();
          this.doneCompact = !this.doneCompact;
          this.render();
        });
      }

      if (status.id === "backlog") {
        this.renderQuickAdd(column);
      }

      const list = column.createDiv("task-manager-task-list");
      for (const task of columnTasks) {
        this.renderTaskCard(list, task, status.id === "done" && this.doneCompact);
      }
    }
  }

  private renderKanbanControls(shell: HTMLElement): void {
    const controls = shell.createDiv("task-manager-controls");
    const search = controls.createDiv("task-manager-control");
    search.createSpan({ text: "Buscar" });
    const input = search.createEl("input", {
      cls: "task-manager-filter-input",
      attr: {
        type: "search",
        placeholder: "Titulo da task",
        "aria-label": "Buscar task por titulo",
      },
    });
    input.value = this.taskSearchQuery;
    input.addEventListener("input", () => {
      const cursor = input.selectionStart ?? input.value.length;
      this.taskSearchQuery = input.value;
      this.render();
      requestAnimationFrame(() => {
        const nextInput = this.contentEl.querySelector<HTMLInputElement>(".task-manager-filter-input");
        nextInput?.focus();
        nextInput?.setSelectionRange(cursor, cursor);
      });
    });

    const sort = controls.createDiv("task-manager-control");
    sort.createSpan({ text: "Ordenar" });
    const sortSelect = sort.createEl("select", {
      cls: "dropdown task-manager-sort-select",
      attr: { "aria-label": "Ordenar cards" },
    });
    sortSelect.createEl("option", { text: "Manual", value: "manual" });
    sortSelect.createEl("option", { text: "Prazo", value: "dueDate" });
    sortSelect.createEl("option", { text: "Inicio", value: "startedAt" });
    sortSelect.createEl("option", { text: "Termino", value: "completedAt" });
    sortSelect.value = this.sortField;
    sortSelect.addEventListener("change", () => {
      this.sortField = sortSelect.value as SortField;
      this.render();
    });

    const directionButton = sort.createEl("button", {
      cls: "clickable-icon task-manager-icon-button",
      attr: {
        "aria-label": this.sortDirection === "asc" ? "Ordem ascendente" : "Ordem descendente",
        type: "button",
      },
    });
    setIcon(directionButton, this.sortDirection === "asc" ? "arrow-up-narrow-wide" : "arrow-down-wide-narrow");
    directionButton.addEventListener("click", () => {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      this.render();
    });
  }

  private renderQuickAdd(column: HTMLElement): void {
    const form = column.createDiv("task-manager-quick-add");
    let selectedKanbanId = this.activeKanbanId === "all" ? this.snapshot.kanbans[0]?.id ?? "" : this.activeKanbanId;

    if (this.activeKanbanId === "all") {
      const select = form.createEl("select", { cls: "dropdown task-manager-quick-kanban" });
      for (const kanban of this.snapshot.kanbans) {
        select.createEl("option", { text: kanban.name, value: kanban.id });
      }
      select.addEventListener("change", () => {
        selectedKanbanId = select.value;
      });
    }

    const input = form.createEl("input", {
      cls: "task-manager-quick-input",
      attr: {
        type: "text",
        placeholder: "+ Nova task",
        "aria-label": "Nova task",
      },
    });
    installWikiLinkInputBehavior(this.app, input);

    input.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      const name = input.value.trim();
      if (!name || !selectedKanbanId) {
        return;
      }

      try {
        const activeProject = this.getActiveProjectReference();
        await this.store.createTask({
          name,
          kanbanId: selectedKanbanId,
          status: "backlog",
          projectName: activeProject?.name,
          projectPath: activeProject?.path,
        });
        input.value = "";
      } catch (error) {
        new Notice(`Task Manager: erro ao criar task. ${errorMessage(error)}`);
      }
    });
  }

  private renderTaskCard(list: HTMLElement, task: Task, compact = false): void {
    const card = list.createDiv("task-manager-card");
    card.toggleClass("is-compact", compact);
    card.draggable = true;
    card.dataset.taskId = task.id;
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/task-id", task.id);
      event.dataTransfer?.setData("text/plain", task.id);
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const placement = getDropPlacement(event, card);
      card.toggleClass("is-drop-before", placement === "before");
      card.toggleClass("is-drop-after", placement === "after");
    });
    card.addEventListener("dragleave", () => {
      card.removeClass("is-drop-before");
      card.removeClass("is-drop-after");
    });
    card.addEventListener("drop", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      card.removeClass("is-drop-before");
      card.removeClass("is-drop-after");

      const draggedTask = this.getDraggedTask(event);
      if (!draggedTask || draggedTask.id === task.id) {
        return;
      }

      try {
        if (draggedTask.sourcePath !== task.sourcePath) {
          await this.store.moveTask(draggedTask, task.status, undefined, "after");
          return;
        }

        await this.store.moveTask(draggedTask, task.status, task.id, getDropPlacement(event, card));
      } catch (error) {
        new Notice(`Task Manager: erro ao reordenar task. ${errorMessage(error)}`);
      }
    });
    card.addEventListener("click", () => this.openTask(task));
    card.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.openTaskMenu(event, task);
    });

    const title = card.createDiv("task-manager-card-title");
    title.setText(task.name);

    const settings = this.getSettings();
    const metaTop: InlineMetaPart[] = [];

    if (!compact && settings.cardFields.kanban && this.activeKanbanId === "all") {
      metaTop.push({ type: "text", text: task.kanbanName });
    }

    if (!compact && settings.cardFields.project && task.projectName) {
      metaTop.push({ type: "link", text: task.projectName, path: task.projectPath });
    }

    if (!compact && settings.cardFields.relatedNote && task.relatedNoteName) {
      metaTop.push({ type: "link", text: task.relatedNoteName, path: task.relatedNotePath });
    }

    if (metaTop.length > 0) {
      this.renderInlineMeta(card, "task-manager-card-meta", metaTop, task);
    }

    const metaBottom: string[] = [];
    if (settings.cardFields.priority && task.priority) {
      metaBottom.push(priorityLabel(task.priority));
    }
    if (settings.cardFields.size && task.size) {
      metaBottom.push(`T ${task.size}`);
    }
    if (settings.cardFields.dueDate && task.dueDate) {
      metaBottom.push(formatDate(task.dueDate, settings.dateFormat));
    }
    if (compact && task.completedAt) {
      metaBottom.push(`Fim ${formatDate(task.completedAt, settings.dateFormat)}`);
    }
    if (!task.hasPersistentId) {
      metaBottom.push("sem ID");
    }
    if (task.isFromUnknownColumn) {
      metaBottom.push(task.sourceColumnTitle);
    }

    if (metaBottom.length > 0) {
      card.createDiv({ cls: "task-manager-card-footer", text: metaBottom.join(" | ") });
    }
  }

  private renderProjects(shell: HTMLElement): void {
    const progressService = this.store.getProgressService();
    const scopedTasks = this.getScopedTasks();
    const projects = progressService.getProjects(scopedTasks);
    const layout = shell.createDiv("task-manager-project-layout");
    const list = layout.createDiv("task-manager-project-list");

    if (projects.length === 0) {
      list.createDiv({ cls: "task-manager-empty", text: "Nenhum projeto encontrado nas tasks." });
      return;
    }

    if (!this.selectedProjectId || !projects.some((project) => project.id === this.selectedProjectId)) {
      this.selectedProjectId = projects[0]?.id;
    }

    for (const project of projects) {
      const tasks = scopedTasks.filter((task) => task.projectId === project.id);
      const metrics = progressService.calculate(tasks);
      const item = list.createDiv("task-manager-project-row");
      item.toggleClass("is-active", this.selectedProjectId === project.id);
      item.addEventListener("click", () => {
        this.selectedProjectId = project.id;
        this.render();
      });
      item.createEl("span", { text: project.name });
      item.createEl("span", { text: `${metrics.taskProgressPercentage}%` });
      this.renderProgressBar(item, metrics.taskProgressPercentage);
    }

    const project = projects.find((item) => item.id === this.selectedProjectId);
    if (project) {
      this.renderProjectDetails(layout, project);
    }
  }

  private renderProjectDetails(layout: HTMLElement, project: Project): void {
    const progressService = this.store.getProgressService();
    const scopedTasks = this.getScopedTasks();
    const tasks = scopedTasks.filter((task) => task.projectId === project.id);
    const metrics = progressService.calculateProjectProgress(scopedTasks, project.id);
    const panel = layout.createDiv("task-manager-project-detail");
    panel.createEl("h3", { text: project.name });
    this.renderMetrics(panel, metrics);

    panel.createEl("h4", { text: "Tasks" });
    const taskList = panel.createDiv("task-manager-project-tasks");
    for (const task of tasks) {
      this.renderProjectTaskCard(taskList, task);
    }
  }

  private renderDashboard(shell: HTMLElement): void {
    const progressService = this.store.getProgressService();
    const tasks = this.getScopedTasks();
    const metrics = progressService.calculate(tasks);
    const counts = progressService.getStatusCounts(tasks);
    const overdue = progressService.getOverdueTasks(tasks);
    const projects = progressService.getProjects(tasks);
    const workedTasks = this.getDashboardDateFilteredTasks(tasks, this.dashboardDateField);
    const startedTasks = this.getDashboardDateFilteredTasks(tasks, "startedAt");
    const completedTasks = this.getDashboardDateFilteredTasks(tasks, "completedAt");
    const pointTasks = tasks.filter((task) => typeof task.size === "number");
    const completedPoints = completedTasks.reduce((sum, task) => sum + (task.size ?? 0), 0);
    const pointsPerWeek = completedPoints / this.getDashboardWeekCount(completedTasks, "completedAt");
    const relatedNotes = unique(
      tasks
        .map((task) => task.relatedNotePath ?? task.relatedNoteName)
        .filter((value): value is string => Boolean(value)),
    );

    const grid = shell.createDiv("task-manager-dashboard-grid");
    this.renderDashboardMetric(grid, "Tasks", String(metrics.totalTasks));
    this.renderDashboardMetric(grid, "Backlog", String(counts.backlog));
    this.renderDashboardMetric(grid, "To Do", String(counts.to_do));
    this.renderDashboardMetric(grid, "Doing", String(counts.doing));
    this.renderDashboardMetric(grid, "Done", String(counts.done));
    this.renderDashboardMetric(grid, "Atrasadas", String(overdue.length));
    this.renderDashboardMetric(grid, "Pontos", `${metrics.completedPoints}/${metrics.totalPoints}`);
    this.renderDashboardMetric(grid, "Projetos", String(projects.length));

    const analysis = shell.createDiv("task-manager-dashboard-section");
    analysis.createEl("h3", { text: "Analise do periodo" });
    const analysisGrid = analysis.createDiv("task-manager-dashboard-grid");
    this.renderDashboardMetric(analysisGrid, `Trabalhadas por ${dashboardFieldLabel(this.dashboardDateField)}`, String(workedTasks.length));
    this.renderDashboardMetric(analysisGrid, "Iniciadas", String(startedTasks.length));
    this.renderDashboardMetric(analysisGrid, "Finalizadas", String(completedTasks.length));
    this.renderDashboardMetric(analysisGrid, "Pontos entregues", String(completedPoints));
    this.renderDashboardMetric(analysisGrid, "Pontos/semana", formatDecimal(pointsPerWeek));
    this.renderDashboardMetric(analysisGrid, "Com pontos", String(pointTasks.length));
    this.renderDashboardMetric(analysisGrid, "Sem pontos", String(tasks.length - pointTasks.length));
    this.renderDashboardMetric(analysisGrid, "Com projeto", String(tasks.filter((task) => task.projectId).length));
    this.renderDashboardMetric(analysisGrid, "Sem projeto", String(tasks.filter((task) => !task.projectId).length));
    this.renderDashboardMetric(analysisGrid, "Notas relacionadas", String(relatedNotes.length));
    this.renderDashboardMetric(analysisGrid, "Sem nota", String(tasks.filter((task) => !task.relatedNoteName).length));

    const section = shell.createDiv("task-manager-dashboard-section");
    section.createEl("h3", { text: "Projetos" });

    if (projects.length === 0) {
      section.createDiv({ cls: "task-manager-empty", text: "Nenhum projeto encontrado." });
      return;
    }

    for (const project of projects) {
      const projectMetrics = progressService.calculateProjectProgress(tasks, project.id);
      const row = section.createDiv("task-manager-project-row");
      row.createEl("span", { text: project.name });
      row.createEl("span", { text: `${projectMetrics.taskProgressPercentage}%` });
      this.renderProgressBar(row, projectMetrics.taskProgressPercentage);
    }
  }

  private renderDashboardControls(shell: HTMLElement): void {
    const controls = shell.createDiv("task-manager-controls");
    const field = controls.createDiv("task-manager-control");
    field.createSpan({ text: "Trabalhadas por" });
    const fieldSelect = field.createEl("select", {
      cls: "dropdown",
      attr: { "aria-label": "Campo de data do dashboard" },
    });
    fieldSelect.createEl("option", { text: "Data de termino", value: "completedAt" });
    fieldSelect.createEl("option", { text: "Data de inicio", value: "startedAt" });
    fieldSelect.value = this.dashboardDateField;
    fieldSelect.addEventListener("change", () => {
      this.dashboardDateField = fieldSelect.value as DashboardDateField;
      this.render();
    });

    const range = controls.createDiv("task-manager-control");
    range.createSpan({ text: "Periodo" });
    const rangeSelect = range.createEl("select", {
      cls: "dropdown",
      attr: { "aria-label": "Periodo do dashboard" },
    });
    rangeSelect.createEl("option", { text: "Todo periodo", value: "all" });
    rangeSelect.createEl("option", { text: "Ultimos 7 dias", value: "7" });
    rangeSelect.createEl("option", { text: "Ultimos 30 dias", value: "30" });
    rangeSelect.createEl("option", { text: "Ultimos 90 dias", value: "90" });
    rangeSelect.value = this.dashboardRange;
    rangeSelect.addEventListener("change", () => {
      this.dashboardRange = rangeSelect.value as DashboardRange;
      this.render();
    });
  }

  private renderMetrics(container: HTMLElement, metrics: ProgressMetrics): void {
    const grid = container.createDiv("task-manager-detail-metrics");
    this.renderDashboardMetric(grid, "Tasks", `${metrics.completedTasks}/${metrics.totalTasks}`);
    this.renderDashboardMetric(grid, "Progresso", `${metrics.taskProgressPercentage}%`);
    this.renderDashboardMetric(grid, "Pontos", `${metrics.completedPoints}/${metrics.totalPoints}`);
    this.renderDashboardMetric(grid, "Pontos", `${metrics.pointProgressPercentage}%`);
  }

  private renderProjectTaskCard(container: HTMLElement, task: Task): void {
    const card = container.createDiv("task-manager-project-task-card");
    card.addEventListener("click", () => this.openTask(task));

    const icon = card.createSpan("task-manager-project-task-status");
    icon.toggleClass("is-done", task.status === "done");
    setIcon(icon, task.status === "done" ? "circle-check" : "circle");

    const content = card.createDiv("task-manager-project-task-content");
    content.createDiv({ cls: "task-manager-project-task-title", text: task.name });

    const meta: InlineMetaPart[] = [
      { type: "text", text: task.kanbanName },
      { type: "text", text: statusLabel(task.status) },
    ];
    if (task.relatedNoteName) {
      meta.push({ type: "link", text: task.relatedNoteName, path: task.relatedNotePath });
    }
    if (task.priority) {
      meta.push({ type: "text", text: priorityLabel(task.priority) });
    }
    if (task.size) {
      meta.push({ type: "text", text: `T ${task.size}` });
    }
    if (task.dueDate) {
      meta.push({ type: "text", text: formatDate(task.dueDate, this.getSettings().dateFormat) });
    }
    this.renderInlineMeta(content, "task-manager-project-task-meta", meta, task);
  }

  private renderDashboardMetric(container: HTMLElement, label: string, value: string): void {
    const item = container.createDiv("task-manager-metric");
    item.createEl("span", { text: label });
    item.createEl("strong", { text: value });
  }

  private renderProgressBar(container: HTMLElement, value: number): void {
    const bar = container.createDiv("task-manager-progress");
    bar.createDiv("task-manager-progress-fill").style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  private attachDropTarget(column: HTMLElement, status: TaskStatus): void {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.addClass("is-drop-target");
    });
    column.addEventListener("dragleave", () => {
      column.removeClass("is-drop-target");
    });
    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      column.removeClass("is-drop-target");
      const task = this.getDraggedTask(event);

      if (!task) {
        return;
      }

      try {
        await this.store.moveTask(task, status, undefined, "after");
      } catch (error) {
        new Notice(`Task Manager: erro ao mover task. ${errorMessage(error)}`);
      }
    });
  }

  private openTask(task: Task): void {
    new TaskDetailsModal(this.app, {
      task,
      snapshot: this.snapshot,
      onSave: (current, patch) => this.store.updateTask(current, patch),
      onDelete: (current) => this.store.deleteTask(current),
    }).open();
  }

  private renderInlineMeta(container: HTMLElement, className: string, parts: InlineMetaPart[], task: Task): void {
    const meta = container.createDiv(className);
    parts.forEach((part, index) => {
      if (index > 0) {
        meta.createSpan({ cls: "task-manager-meta-separator", text: " | " });
      }

      if (part.type === "text") {
        meta.createSpan({ text: part.text });
        return;
      }

      this.renderNoteLink(meta, task, part.text, part.path);
    });
  }

  private renderNoteLink(container: HTMLElement, task: Task, label: string, path?: string): void {
    const button = container.createEl("button", {
      cls: "task-manager-note-link",
      text: label,
      attr: {
        type: "button",
        title: path ? `Abrir ${path}` : `Abrir ${label}`,
      },
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.openNoteReference(label, path, task.sourcePath);
    });
  }

  private async openNoteReference(label: string, path: string | undefined, sourcePath: string): Promise<void> {
    try {
      if (path) {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(file);
          return;
        }
      }

      await this.app.workspace.openLinkText(label, sourcePath, false);
    } catch (error) {
      new Notice(`Task Manager: erro ao abrir nota. ${errorMessage(error)}`);
    }
  }

  private getDraggedTask(event: DragEvent): Task | undefined {
    const taskId = event.dataTransfer?.getData("text/task-id") || event.dataTransfer?.getData("text/plain");
    return this.snapshot.tasks.find((item) => item.id === taskId);
  }

  private openTaskMenu(event: MouseEvent, task: Task): void {
    const menu = new Menu();
    menu.addItem((item) => {
      item.setTitle("Editar").setIcon("pencil").onClick(() => this.openTask(task));
    });
    if (task.projectName) {
      menu.addItem((item) => {
        item
          .setTitle("Abrir projeto")
          .setIcon("folder-open")
          .onClick(() => void this.openNoteReference(task.projectName ?? "", task.projectPath, task.sourcePath));
      });
    }
    if (task.relatedNoteName) {
      menu.addItem((item) => {
        item
          .setTitle("Abrir nota relacionada")
          .setIcon("file-text")
          .onClick(() => void this.openNoteReference(task.relatedNoteName ?? "", task.relatedNotePath, task.sourcePath));
      });
    }
    menu.addItem((item) => {
      item.setTitle("Excluir").setIcon("trash").onClick(() => {
        new ConfirmModal(this.app, "Excluir task", `Excluir "${task.name}"?`, async () => {
          await this.store.deleteTask(task);
        }).open();
      });
    });
    menu.showAtMouseEvent(event);
  }

  private createTabButton(container: HTMLElement, label: string, active: boolean, onClick: () => void): void {
    const button = container.createEl("button", {
      cls: "task-manager-tab",
      text: label,
      attr: { type: "button" },
    });
    button.toggleClass("is-active", active);
    button.addEventListener("click", onClick);
  }

  private getVisibleTasks(): Task[] {
    const query = normalizeSearch(this.taskSearchQuery);
    const tasks = this.getScopedTasks();

    if (!query) {
      return tasks;
    }

    return tasks.filter((task) => normalizeSearch(task.name).includes(query));
  }

  private getKanbanScopedTasks(): Task[] {
    if (this.activeKanbanId === "all") {
      return this.snapshot.tasks;
    }

    return this.snapshot.tasks.filter((task) => task.kanbanId === this.activeKanbanId);
  }

  private getScopedTasks(): Task[] {
    const tasks = this.getKanbanScopedTasks();

    if (this.activeProjectFilterId === "all") {
      return tasks;
    }

    if (this.activeProjectFilterId === NO_PROJECT_FILTER) {
      return tasks.filter((task) => !task.projectId);
    }

    return tasks.filter((task) => task.projectId === this.activeProjectFilterId);
  }

  private getOrderedColumnTasks(tasks: Task[]): Task[] {
    if (this.sortField === "manual") {
      return tasks;
    }

    return [...tasks].sort((a, b) => compareTaskDate(a, b, this.sortField as TaskDateField, this.sortDirection));
  }

  private getActiveProjectReference(): { name: string; path?: string } | undefined {
    if (this.activeProjectFilterId === "all" || this.activeProjectFilterId === NO_PROJECT_FILTER) {
      return undefined;
    }

    const task = this.getKanbanScopedTasks().find((item) => item.projectId === this.activeProjectFilterId && item.projectName);
    if (!task?.projectName) {
      return undefined;
    }

    return {
      name: task.projectName,
      path: task.projectPath,
    };
  }

  private getDashboardDateFilteredTasks(tasks: Task[], field: DashboardDateField): Task[] {
    return tasks.filter((task) => isInDashboardRange(task[field], this.dashboardRange));
  }

  private getDashboardWeekCount(tasks: Task[], field: DashboardDateField): number {
    if (this.dashboardRange !== "all") {
      return Math.max(1, Number(this.dashboardRange) / 7);
    }

    const dates = tasks
      .map((task) => task[field])
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value))
      .sort((a, b) => a - b);

    if (dates.length < 2) {
      return 1;
    }

    const days = Math.max(1, (dates[dates.length - 1] - dates[0]) / 86_400_000);
    return Math.max(1, days / 7);
  }

  private ensureValidSelection(): void {
    if (this.activeKanbanId !== "all" && !this.snapshot.kanbans.some((kanban) => kanban.id === this.activeKanbanId)) {
      this.activeKanbanId = "all";
    }

    const kanbanScopedTasks = this.getKanbanScopedTasks();
    const projects = this.store.getProgressService().getProjects(kanbanScopedTasks);
    const hasNoProjectTasks = kanbanScopedTasks.some((task) => !task.projectId);
    const projectFilterExists =
      this.activeProjectFilterId === "all" ||
      (this.activeProjectFilterId === NO_PROJECT_FILTER && hasNoProjectTasks) ||
      projects.some((project) => project.id === this.activeProjectFilterId);

    if (!projectFilterExists) {
      this.activeProjectFilterId = "all";
    }
  }
}

interface InlineMetaPart {
  type: "text" | "link";
  text: string;
  path?: string;
}

function priorityLabel(priority: Task["priority"]): string {
  if (priority === "media") {
    return "Media";
  }

  if (priority === "critica") {
    return "Critica";
  }

  return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : "";
}

function statusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((item) => item.id === status)?.label ?? status;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getDropPlacement(event: DragEvent, target: HTMLElement): "before" | "after" {
  const rect = target.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function compareTaskDate(a: Task, b: Task, field: TaskDateField, direction: SortDirection): number {
  const aTime = parseSortableDate(a[field]);
  const bTime = parseSortableDate(b[field]);

  if (aTime === undefined && bTime === undefined) {
    return a.sourceLine - b.sourceLine;
  }

  if (aTime === undefined) {
    return 1;
  }

  if (bTime === undefined) {
    return -1;
  }

  const result = aTime - bTime;
  return direction === "asc" ? result : -result;
}

function parseSortableDate(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function isInDashboardRange(value: string | undefined, range: DashboardRange): boolean {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return false;
  }

  if (range === "all") {
    return true;
  }

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - Number(range));
  start.setHours(0, 0, 0, 0);
  return time >= start.getTime() && time <= now.getTime();
}

function dashboardFieldLabel(field: DashboardDateField): string {
  return field === "startedAt" ? "inicio" : "termino";
}

function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  });
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
