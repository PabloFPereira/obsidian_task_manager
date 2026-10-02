import { PluginSettingTab, Setting } from "obsidian";
import type TaskManagerPlugin from "../main";
import type { CardFieldSettings, TaskManagerSettings } from "./TaskManagerSettings";

export class TaskManagerSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: TaskManagerPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Task Manager" });

    new Setting(containerEl)
      .setName("Pasta dos Kanbans")
      .setDesc("Pasta do vault onde ficam os arquivos Markdown de Kanban.")
      .addText((text) => {
        text
          .setPlaceholder("Tasks")
          .setValue(this.plugin.settings.kanbanFolder)
          .onChange((value) => this.updatePluginSettings({ kanbanFolder: value.trim() || "Tasks" }));
      });

    new Setting(containerEl)
      .setName("Arquivos incluidos")
      .setDesc("Opcional. Separe padrões por virgula. Exemplo: Tasks - *.md")
      .addText((text) => {
        text.setValue(this.plugin.settings.includeFiles).onChange((value) => this.updatePluginSettings({ includeFiles: value }));
      });

    new Setting(containerEl)
      .setName("Arquivos excluidos")
      .setDesc("Opcional. Separe padrões por virgula.")
      .addText((text) => {
        text.setValue(this.plugin.settings.excludeFiles).onChange((value) => this.updatePluginSettings({ excludeFiles: value }));
      });

    new Setting(containerEl).setName("Formato visual das datas").addDropdown((dropdown) => {
      dropdown
        .addOption("DD/MM", "DD/MM")
        .addOption("DD/MM/YYYY", "DD/MM/YYYY")
        .addOption("YYYY-MM-DD", "YYYY-MM-DD")
        .setValue(this.plugin.settings.dateFormat)
        .onChange((value) => this.updatePluginSettings({ dateFormat: value as TaskManagerSettings["dateFormat"] }));
    });

    new Setting(containerEl)
      .setName("Automacao de data_inicio")
      .setDesc("Preencher quando a task entrar em Doing pela primeira vez.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoStartDate).onChange((value) => this.updatePluginSettings({ autoStartDate: value }));
      });

    new Setting(containerEl)
      .setName("Automacao de data_termino")
      .setDesc("Preencher quando a task entrar em Done pela primeira vez.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoDoneDate).onChange((value) => this.updatePluginSettings({ autoDoneDate: value }));
      });

    containerEl.createEl("h3", { text: "Campos exibidos nos cards" });
    this.renderCardFieldToggle("Origem Kanban", "kanban");
    this.renderCardFieldToggle("Projeto", "project");
    this.renderCardFieldToggle("Nota relacionada", "relatedNote");
    this.renderCardFieldToggle("Prioridade", "priority");
    this.renderCardFieldToggle("Tamanho", "size");
    this.renderCardFieldToggle("Prazo", "dueDate");
  }

  private renderCardFieldToggle(label: string, key: keyof CardFieldSettings): void {
    new Setting(this.containerEl).setName(label).addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.cardFields[key]).onChange((value) => {
        void this.updatePluginSettings({
          cardFields: {
            ...this.plugin.settings.cardFields,
            [key]: value,
          },
        });
      });
    });
  }

  private async updatePluginSettings(patch: Partial<TaskManagerSettings>): Promise<void> {
    await this.plugin.updateSettings(patch);
  }
}
