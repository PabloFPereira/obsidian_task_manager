import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { TaskManagerStore } from "./application/services/TaskManagerStore";
import { DEFAULT_SETTINGS, type TaskManagerSettings } from "./settings/TaskManagerSettings";
import { TaskManagerSettingTab } from "./settings/TaskManagerSettingTab";
import { TASK_MANAGER_VIEW_TYPE, TaskManagerView } from "./views/TaskManagerView";

export default class TaskManagerPlugin extends Plugin {
  settings: TaskManagerSettings = DEFAULT_SETTINGS;
  private store: TaskManagerStore | undefined;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.store = new TaskManagerStore(this.app, () => this.settings);
    await this.store.start();

    this.registerView(TASK_MANAGER_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
      if (!this.store) {
        throw new Error("Task Manager store is not ready.");
      }

      return new TaskManagerView(leaf, this.store, () => this.settings);
    });

    this.addRibbonIcon("list-checks", "Task Manager", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-task-manager",
      name: "Abrir Task Manager",
      callback: () => {
        void this.activateView();
      },
    });

    this.addCommand({
      id: "reload-task-manager-kanbans",
      name: "Recarregar Kanbans do Task Manager",
      callback: async () => {
        await this.store?.reloadAll();
        new Notice("Task Manager: Kanbans recarregados.");
      },
    });

    this.addSettingTab(new TaskManagerSettingTab(this));
  }

  onunload(): void {
    this.store?.stop();
    this.app.workspace.detachLeavesOfType(TASK_MANAGER_VIEW_TYPE);
  }

  async updateSettings(patch: Partial<TaskManagerSettings>): Promise<void> {
    this.settings = {
      ...this.settings,
      ...patch,
      cardFields: {
        ...this.settings.cardFields,
        ...patch.cardFields,
      },
    };
    await this.saveSettings();
    await this.store?.reloadAll();
  }

  private async activateView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(TASK_MANAGER_VIEW_TYPE);
    const existing = leaves[0];

    if (existing) {
      this.app.workspace.revealLeaf(existing);
      return;
    }

    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: TASK_MANAGER_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<TaskManagerSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      cardFields: {
        ...DEFAULT_SETTINGS.cardFields,
        ...loaded?.cardFields,
      },
    };
  }

  private async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
