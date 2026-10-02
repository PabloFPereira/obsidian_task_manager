import { App, ButtonComponent, Modal, Setting } from "obsidian";

export class ConfirmModal extends Modal {
  constructor(
    app: App,
    private readonly title: string,
    private readonly message: string,
    private readonly onConfirm: () => void | Promise<void>,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.titleEl.setText(this.title);
    this.contentEl.createEl("p", { text: this.message });

    new Setting(this.contentEl)
      .addButton((button: ButtonComponent) => {
        button.setButtonText("Cancelar").onClick(() => this.close());
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText("Excluir")
          .setWarning()
          .onClick(async () => {
            await this.onConfirm();
            this.close();
          });
      });
  }
}
