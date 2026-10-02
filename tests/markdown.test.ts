import { describe, expect, it } from "vitest";
import { MarkdownKanbanParser } from "../src/infrastructure/markdown/MarkdownKanbanParser";
import { MarkdownKanbanSerializer } from "../src/infrastructure/markdown/MarkdownKanbanSerializer";

const sample = `---
kanban-plugin: board
---

## Backlog

- [ ] Criar dashboard [[Projeto A]] [[Nota Tecnica]] @{2026-09-28}

## To-Do

- [ ] Task com metadata %% task-manager: {"id":"task_1","status":"to_do","projectName":"Projeto B","priority":"alta","size":5,"createdAt":"2026-09-24T10:00:00.000Z","updatedAt":"2026-09-24T10:00:00.000Z"} %%

## Done

**Complete**
- [x] Feita

## Archive

- [x] Arquivada

%% kanban:settings
\`\`\`
{"kanban-plugin":"board"}
\`\`\`
%%`;

describe("MarkdownKanbanParser", () => {
  it("parses Obsidian Kanban tasks without changing source content", () => {
    const parser = new MarkdownKanbanParser((linkText) => {
      if (linkText === "Projeto A") {
        return { name: "Projeto A", path: "Projects/Projeto A.md", isProject: true };
      }

      return { name: linkText, path: `Notes/${linkText}.md`, isProject: false };
    });
    const document = parser.parse("Tasks/Tasks - Job.md", sample);

    expect(document.tasks).toHaveLength(3);
    expect(document.tasks[0].task.name).toBe("Criar dashboard [[Projeto A]] [[Nota Tecnica]]");
    expect(document.tasks[0].task.projectName).toBe("Projeto A");
    expect(document.tasks[0].task.projectPath).toBe("Projects/Projeto A.md");
    expect(document.tasks[0].task.relatedNoteName).toBe("Nota Tecnica");
    expect(document.tasks[0].task.relatedNotePath).toBe("Notes/Nota Tecnica.md");
    expect(document.tasks[0].task.dueDate).toBe("2026-09-28");
    expect(document.tasks[0].task.status).toBe("backlog");
    expect(document.tasks[0].task.hasPersistentId).toBe(false);
    expect(document.tasks[1].task.id).toBe("task_1");
    expect(document.tasks[1].task.priority).toBe("alta");
    expect(document.tasks[1].task.size).toBe(5);
    expect(document.tasks.some((item) => item.task.name === "Arquivada")).toBe(false);
  });
});

describe("MarkdownKanbanSerializer", () => {
  it("moves a task to a new canonical section and preserves kanban settings", () => {
    const parser = new MarkdownKanbanParser();
    const serializer = new MarkdownKanbanSerializer();
    const document = parser.parse("Tasks/Tasks - Job.md", sample);
    const task = {
      ...document.tasks[0].task,
      status: "doing" as const,
      updatedAt: "2026-09-24T12:00:00.000Z",
      hasPersistentId: true,
    };

    const next = serializer.updateTask(document, task);

    expect(next).toContain("## Doing");
    expect(next).toContain('"status":"doing"');
    expect(next).toContain("%% kanban:settings");
    expect(next).toContain("## Archive");
  });

  it("preserves unknown columns when the status did not change", () => {
    const parser = new MarkdownKanbanParser();
    const serializer = new MarkdownKanbanSerializer();
    const document = parser.parse(
      "Tasks/Custom.md",
      `## Acompanhar

- [ ] Conferir retorno
`,
    );
    const task = {
      ...document.tasks[0].task,
      name: "Conferir retorno atualizado",
      updatedAt: "2026-09-24T12:00:00.000Z",
      hasPersistentId: true,
    };

    const next = serializer.updateTask(document, task);

    expect(next).toContain("## Acompanhar");
    expect(next).toContain("Conferir retorno atualizado");
    expect(next).not.toContain("## Backlog");
  });

  it("reorders tasks above or below another task in the same section", () => {
    const parser = new MarkdownKanbanParser();
    const serializer = new MarkdownKanbanSerializer();
    const document = parser.parse(
      "Tasks/Reorder.md",
      `## Backlog

- [ ] Primeira
- [ ] Segunda
- [ ] Terceira
`,
    );
    const terceira = {
      ...document.tasks[2].task,
      updatedAt: "2026-09-24T12:00:00.000Z",
      hasPersistentId: true,
    };

    const next = serializer.moveTask(document, terceira, document.tasks[0].task.id, "before");

    expect(next.indexOf("Terceira")).toBeLessThan(next.indexOf("Primeira"));
    expect(next.indexOf("Primeira")).toBeLessThan(next.indexOf("Segunda"));
  });

  it("creates new tasks at the top of the target section", () => {
    const parser = new MarkdownKanbanParser();
    const serializer = new MarkdownKanbanSerializer();
    const document = parser.parse(
      "Tasks/Create.md",
      `## Backlog

- [ ] Antiga
- [ ] Mais antiga
`,
    );
    const newTask = {
      ...document.tasks[0].task,
      id: "task_new",
      name: "Nova prioridade",
      sourceLine: -1,
      hasPersistentId: true,
      createdAt: "2026-09-24T12:00:00.000Z",
      updatedAt: "2026-09-24T12:00:00.000Z",
    };

    const next = serializer.createTask(document, newTask);

    expect(next.indexOf("Nova prioridade")).toBeLessThan(next.indexOf("Antiga"));
    expect(next.indexOf("Antiga")).toBeLessThan(next.indexOf("Mais antiga"));
  });
});
