export interface CardFieldSettings {
  kanban: boolean;
  project: boolean;
  relatedNote: boolean;
  priority: boolean;
  size: boolean;
  dueDate: boolean;
}

export interface TaskManagerSettings {
  kanbanFolder: string;
  includeFiles: string;
  excludeFiles: string;
  dateFormat: "YYYY-MM-DD" | "DD/MM/YYYY" | "DD/MM";
  autoStartDate: boolean;
  autoDoneDate: boolean;
  cardFields: CardFieldSettings;
}

export const DEFAULT_SETTINGS: TaskManagerSettings = {
  kanbanFolder: "Tasks",
  includeFiles: "",
  excludeFiles: "",
  dateFormat: "DD/MM",
  autoStartDate: true,
  autoDoneDate: true,
  cardFields: {
    kanban: true,
    project: true,
    relatedNote: true,
    priority: true,
    size: true,
    dueDate: true,
  },
};
