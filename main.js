/* Kanban Task Manager for Obsidian */
var __ktm_modules = {
"./application/services/TaskManagerStore.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskManagerStore = void 0;
const obsidian_1 = require("obsidian");
const ProgressService_1 = require("../../domain/services/ProgressService");
const TaskService_1 = require("../../domain/services/TaskService");
const KanbanMarkdownRepository_1 = require("../../infrastructure/markdown/KanbanMarkdownRepository");
const date_1 = require("../../utils/date");
class TaskManagerStore {
    constructor(app, getSettings) {
        this.app = app;
        this.getSettings = getSettings;
        this.kanbans = [];
        this.listeners = new Set();
        this.internalWrites = new Set();
        this.progressService = new ProgressService_1.ProgressService();
        this.eventRefs = [];
        this.repository = new KanbanMarkdownRepository_1.KanbanMarkdownRepository(app, getSettings);
        this.debouncedExternalReload = (0, obsidian_1.debounce)((path) => {
            void this.reloadFile(path);
        }, 250, true);
    }
    async start() {
        await this.reloadAll();
        this.registerVaultEvents();
    }
    stop() {
        for (const ref of this.eventRefs) {
            this.app.vault.offref(ref);
        }
        this.eventRefs = [];
        this.listeners.clear();
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.snapshot());
        return () => {
            this.listeners.delete(listener);
        };
    }
    snapshot() {
        const tasks = this.kanbans.flatMap((kanban) => kanban.tasks);
        return {
            kanbans: this.kanbans,
            tasks,
            loadedAt: (0, date_1.nowIso)(),
        };
    }
    async reloadAll() {
        try {
            this.kanbans = await this.repository.loadAll();
            this.emit();
        }
        catch (error) {
            new obsidian_1.Notice(`Task Manager: erro ao carregar Kanbans. ${errorMessage(error)}`);
        }
    }
    async reloadFile(path) {
        if (!this.repository.isKanbanPath(path)) {
            return;
        }
        try {
            const updated = await this.repository.loadOne(path);
            this.kanbans = updated
                ? replaceKanban(this.kanbans, updated)
                : this.kanbans.filter((kanban) => kanban.path !== path);
            this.emit();
        }
        catch (error) {
            new obsidian_1.Notice(`Task Manager: erro ao atualizar ${path}. ${errorMessage(error)}`);
        }
    }
    async createTask(draft) {
        const kanban = this.kanbans.find((item) => item.id === draft.kanbanId);
        if (!kanban) {
            throw new Error("Kanban not found.");
        }
        const task = this.taskService().createTask(draft, kanban.name, kanban.path);
        await this.write(kanban.path, () => this.repository.createTask(task));
        await this.reloadFile(kanban.path);
    }
    async saveTask(task) {
        await this.write(task.sourcePath, () => this.repository.updateTask(task));
        await this.reloadFile(task.sourcePath);
    }
    async updateTask(task, patch) {
        const updated = this.taskService().updateTask(task, patch);
        await this.saveTask(updated);
    }
    async changeStatus(task, status) {
        const updated = this.taskService().changeStatus(task, status);
        await this.saveTask(updated);
    }
    async moveTask(task, status, targetTaskId, placement) {
        const updated = task.status === status
            ? this.taskService().updateTask(task, { status })
            : this.taskService().changeStatus(task, status);
        await this.write(updated.sourcePath, () => this.repository.moveTask(updated, targetTaskId, placement));
        await this.reloadFile(updated.sourcePath);
    }
    async deleteTask(task) {
        await this.write(task.sourcePath, () => this.repository.deleteTask(task));
        await this.reloadFile(task.sourcePath);
    }
    getProgressService() {
        return this.progressService;
    }
    registerVaultEvents() {
        this.eventRefs.push(this.app.vault.on("modify", (file) => {
            if (!(file instanceof obsidian_1.TFile) || !this.repository.isKanbanPath(file.path)) {
                return;
            }
            if (this.internalWrites.has(file.path)) {
                this.internalWrites.delete(file.path);
                return;
            }
            this.debouncedExternalReload(file.path);
        }));
        this.eventRefs.push(this.app.vault.on("create", (file) => {
            if (file instanceof obsidian_1.TFile && this.repository.isKanbanPath(file.path)) {
                void this.reloadAll();
            }
        }));
        this.eventRefs.push(this.app.vault.on("delete", (file) => {
            if (file instanceof obsidian_1.TFile && this.repository.isKanbanPath(file.path)) {
                this.kanbans = this.kanbans.filter((kanban) => kanban.path !== file.path);
                this.emit();
            }
        }));
    }
    async write(path, action) {
        this.internalWrites.add(path);
        try {
            await action();
        }
        catch (error) {
            this.internalWrites.delete(path);
            throw error;
        }
    }
    emit() {
        const snapshot = this.snapshot();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
    taskService() {
        const settings = this.getSettings();
        return new TaskService_1.TaskService({
            setStartedAtOnDoing: settings.autoStartDate,
            setCompletedAtOnDone: settings.autoDoneDate,
        });
    }
}
exports.TaskManagerStore = TaskManagerStore;
function replaceKanban(kanbans, updated) {
    const exists = kanbans.some((kanban) => kanban.path === updated.path);
    const next = exists
        ? kanbans.map((kanban) => (kanban.path === updated.path ? updated : kanban))
        : [...kanbans, updated];
    return next.sort((a, b) => a.name.localeCompare(b.name));
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

},
"./domain/models/Kanban.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},
"./domain/models/MarkdownDocument.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},
"./domain/models/ProgressMetrics.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},
"./domain/models/Project.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},
"./domain/models/Task.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_SIZES = exports.TASK_PRIORITIES = exports.TASK_STATUSES = void 0;
exports.TASK_STATUSES = [
    { id: "backlog", label: "Backlog" },
    { id: "to_do", label: "To Do" },
    { id: "doing", label: "Doing" },
    { id: "done", label: "Done" },
];
exports.TASK_PRIORITIES = [
    { id: "baixa", label: "Baixa" },
    { id: "media", label: "Media" },
    { id: "alta", label: "Alta" },
    { id: "critica", label: "Critica" },
];
exports.TASK_SIZES = [1, 2, 3, 5, 8, 13, 21];

},
"./domain/models/UserStory.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},
"./domain/rules/taskRules.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTaskPriority = isTaskPriority;
exports.isTaskSize = isTaskSize;
exports.isTaskOverdue = isTaskOverdue;
exports.applyStatusDateRules = applyStatusDateRules;
const Task_1 = require("../models/Task");
const date_1 = require("../../utils/date");
function isTaskPriority(value) {
    return Task_1.TASK_PRIORITIES.some((priority) => priority.id === value);
}
function isTaskSize(value) {
    return Task_1.TASK_SIZES.includes(value);
}
function isTaskOverdue(task, today = (0, date_1.todayIsoDate)()) {
    return Boolean(task.dueDate && task.dueDate < today && task.status !== "done");
}
function applyStatusDateRules(task, nextStatus, now, options) {
    const updated = {
        ...task,
        status: nextStatus,
        updatedAt: now,
    };
    if (task.status === "done" && nextStatus !== "done") {
        updated.completedAt = undefined;
    }
    if (nextStatus === "doing" && !updated.startedAt && options.setStartedAtOnDoing) {
        updated.startedAt = now;
    }
    if (nextStatus === "done" && !updated.completedAt && options.setCompletedAtOnDone) {
        updated.completedAt = now;
    }
    return updated;
}

},
"./domain/services/ProgressService.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressService = void 0;
const taskRules_1 = require("../rules/taskRules");
const id_1 = require("../../utils/id");
class ProgressService {
    getProjects(tasks) {
        const projects = new Map();
        for (const task of tasks) {
            if (!task.projectName) {
                continue;
            }
            const id = task.projectId ?? (0, id_1.slugify)(task.projectName);
            projects.set(id, { id, name: task.projectName });
        }
        return Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    calculate(tasks) {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((task) => task.status === "done").length;
        const pointTasks = tasks.filter((task) => typeof task.size === "number");
        const totalPoints = pointTasks.reduce((sum, task) => sum + (task.size ?? 0), 0);
        const completedPoints = pointTasks
            .filter((task) => task.status === "done")
            .reduce((sum, task) => sum + (task.size ?? 0), 0);
        return {
            totalTasks,
            completedTasks,
            taskProgressPercentage: percentage(completedTasks, totalTasks),
            totalPoints,
            completedPoints,
            pointProgressPercentage: percentage(completedPoints, totalPoints),
        };
    }
    calculateProjectProgress(tasks, projectId) {
        return this.calculate(tasks.filter((task) => task.projectId === projectId));
    }
    getOverdueTasks(tasks) {
        return tasks.filter((task) => (0, taskRules_1.isTaskOverdue)(task));
    }
    getStatusCounts(tasks) {
        return {
            backlog: tasks.filter((task) => task.status === "backlog").length,
            to_do: tasks.filter((task) => task.status === "to_do").length,
            doing: tasks.filter((task) => task.status === "doing").length,
            done: tasks.filter((task) => task.status === "done").length,
        };
    }
}
exports.ProgressService = ProgressService;
function percentage(done, total) {
    if (total === 0) {
        return 0;
    }
    return Math.round((done / total) * 100);
}

},
"./domain/services/TaskService.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const taskRules_1 = require("../rules/taskRules");
const id_1 = require("../../utils/id");
const date_1 = require("../../utils/date");
class TaskService {
    constructor(dateAutomation) {
        this.dateAutomation = dateAutomation;
    }
    createTask(draft, kanbanName, sourcePath) {
        const now = (0, date_1.nowIso)();
        const project = normalizeOptionalName(draft.projectName);
        const relatedNote = normalizeOptionalName(draft.relatedNoteName);
        return {
            id: (0, id_1.createId)("task"),
            name: draft.name.trim(),
            projectId: project ? (0, id_1.slugify)(project) : undefined,
            projectName: project,
            projectPath: draft.projectPath,
            relatedNoteName: relatedNote,
            relatedNotePath: draft.relatedNotePath,
            priority: draft.priority,
            size: draft.size,
            status: draft.status ?? "backlog",
            dueDate: draft.dueDate,
            startedAt: undefined,
            completedAt: undefined,
            kanbanId: draft.kanbanId,
            kanbanName,
            createdAt: now,
            updatedAt: now,
            sourcePath,
            sourceLine: -1,
            sourceColumnTitle: "",
            isFromUnknownColumn: false,
            hasPersistentId: true,
        };
    }
    updateTask(task, patch) {
        const project = normalizeOptionalName(patchedValue(patch, "projectName", task.projectName));
        const relatedNote = normalizeOptionalName(patchedValue(patch, "relatedNoteName", task.relatedNoteName));
        const status = patch.status ?? task.status;
        const base = {
            ...task,
            ...patch,
            id: task.hasPersistentId ? task.id : (0, id_1.createId)("task"),
            projectName: project,
            projectId: project ? (0, id_1.slugify)(project) : undefined,
            projectPath: project ? patchedValue(patch, "projectPath", task.projectPath) : undefined,
            relatedNoteName: relatedNote,
            relatedNotePath: relatedNote ? patchedValue(patch, "relatedNotePath", task.relatedNotePath) : undefined,
            status,
            updatedAt: (0, date_1.nowIso)(),
            hasPersistentId: true,
        };
        if (status !== task.status) {
            return (0, taskRules_1.applyStatusDateRules)({ ...base, status: task.status }, status, base.updatedAt, this.dateAutomation);
        }
        return base;
    }
    changeStatus(task, status) {
        const persistentTask = task.hasPersistentId
            ? task
            : {
                ...task,
                id: (0, id_1.createId)("task"),
                hasPersistentId: true,
            };
        return (0, taskRules_1.applyStatusDateRules)(persistentTask, status, (0, date_1.nowIso)(), this.dateAutomation);
    }
}
exports.TaskService = TaskService;
function normalizeOptionalName(value) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}
function patchedValue(patch, key, fallback) {
    return Object.prototype.hasOwnProperty.call(patch, key) ? patch[key] : fallback;
}

},
"./infrastructure/markdown/KanbanMarkdownRepository.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KanbanMarkdownRepository = void 0;
const obsidian_1 = require("obsidian");
const MarkdownKanbanParser_1 = require("./MarkdownKanbanParser");
const MarkdownKanbanSerializer_1 = require("./MarkdownKanbanSerializer");
class KanbanMarkdownRepository {
    constructor(app, getSettings) {
        this.app = app;
        this.getSettings = getSettings;
        this.serializer = new MarkdownKanbanSerializer_1.MarkdownKanbanSerializer();
    }
    async loadAll() {
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
    async loadOne(path) {
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
    async createTask(task) {
        const file = this.getFile(task.sourcePath);
        if (!file) {
            throw new Error(`Kanban file not found: ${task.sourcePath}`);
        }
        const document = await this.loadFile(file);
        const nextContent = this.serializer.createTask(document, task);
        await this.app.vault.modify(file, nextContent);
    }
    async updateTask(task) {
        const file = this.getFile(task.sourcePath);
        if (!file) {
            throw new Error(`Kanban file not found: ${task.sourcePath}`);
        }
        const document = await this.loadFile(file);
        const nextContent = this.serializer.updateTask(document, task);
        await this.app.vault.modify(file, nextContent);
    }
    async deleteTask(task) {
        const file = this.getFile(task.sourcePath);
        if (!file) {
            throw new Error(`Kanban file not found: ${task.sourcePath}`);
        }
        const document = await this.loadFile(file);
        const nextContent = this.serializer.deleteTask(document, task);
        await this.app.vault.modify(file, nextContent);
    }
    async moveTask(task, targetTaskId, placement) {
        const file = this.getFile(task.sourcePath);
        if (!file) {
            throw new Error(`Kanban file not found: ${task.sourcePath}`);
        }
        const document = await this.loadFile(file);
        const nextContent = this.serializer.moveTask(document, task, targetTaskId, placement);
        await this.app.vault.modify(file, nextContent);
    }
    isKanbanPath(path) {
        const normalized = (0, obsidian_1.normalizePath)(path);
        const folder = normalizeFolder(this.getSettings().kanbanFolder);
        if (!normalized.toLowerCase().endsWith(".md")) {
            return false;
        }
        if (!normalized.startsWith(folder)) {
            return false;
        }
        return this.isIncluded(normalized);
    }
    async loadFile(file) {
        const content = await this.app.vault.read(file);
        const parser = new MarkdownKanbanParser_1.MarkdownKanbanParser((linkText, sourcePath) => this.resolveWikiLink(linkText, sourcePath));
        return parser.parse(file.path, content);
    }
    resolveWikiLink(linkText, sourcePath) {
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
    getKanbanFiles() {
        return this.app.vault
            .getMarkdownFiles()
            .filter((file) => this.isKanbanPath(file.path))
            .sort((a, b) => a.basename.localeCompare(b.basename));
    }
    getFile(path) {
        const abstractFile = this.app.vault.getAbstractFileByPath((0, obsidian_1.normalizePath)(path));
        return abstractFile instanceof obsidian_1.TFile ? abstractFile : undefined;
    }
    findMarkdownByBasename(linkTarget) {
        const normalizedTarget = linkTarget.toLowerCase();
        return this.app.vault
            .getMarkdownFiles()
            .find((file) => file.basename.toLowerCase() === normalizedTarget || file.path.replace(/\.md$/i, "").toLowerCase() === normalizedTarget);
    }
    isIncluded(path) {
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
exports.KanbanMarkdownRepository = KanbanMarkdownRepository;
function isProjectPath(path) {
    return (0, obsidian_1.normalizePath)(path).toLowerCase().startsWith("projects/");
}
function normalizeFolder(folder) {
    const normalized = (0, obsidian_1.normalizePath)(folder.trim() || "Tasks");
    return normalized.endsWith("/") ? normalized : `${normalized}/`;
}
function splitPatterns(value) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}
function matchesPattern(fileName, pattern) {
    if (pattern.includes("*")) {
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
        return new RegExp(`^${escaped}$`, "i").test(fileName);
    }
    return fileName.toLowerCase().includes(pattern.toLowerCase());
}

},
"./infrastructure/markdown/markdownFormat.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DUE_DATE_PATTERN = exports.KANBAN_SETTINGS_PATTERN = exports.TASK_MANAGER_COMMENT_PATTERN = exports.TASK_LINE_PATTERN = exports.HEADING_PATTERN = void 0;
exports.normalizeStatusTitle = normalizeStatusTitle;
exports.statusLabel = statusLabel;
exports.isIgnoredSection = isIgnoredSection;
exports.parseTaskManagerMetadata = parseTaskManagerMetadata;
exports.removeTaskManagerMetadata = removeTaskManagerMetadata;
exports.normalizeComparable = normalizeComparable;
const Task_1 = require("../../domain/models/Task");
exports.HEADING_PATTERN = /^##\s+(.+?)\s*$/;
exports.TASK_LINE_PATTERN = /^(\s*)-\s+\[( |x|X)\]\s+(.*)$/;
exports.TASK_MANAGER_COMMENT_PATTERN = /%%\s*task-manager\s*:?\s*(\{.*?\})\s*%%/;
exports.KANBAN_SETTINGS_PATTERN = /^%%\s*kanban:settings/;
exports.DUE_DATE_PATTERN = /@\{(\d{4}-\d{2}-\d{2})\}/;
function normalizeStatusTitle(title) {
    const normalized = normalizeComparable(title);
    if (normalized === "backlog") {
        return "backlog";
    }
    if (normalized === "to-do" || normalized === "to-do" || normalized === "todo" || normalized === "to-do") {
        return "to_do";
    }
    if (normalized === "to do" || normalized === "to_do") {
        return "to_do";
    }
    if (normalized === "doing") {
        return "doing";
    }
    if (normalized === "done" || normalized === "complete" || normalized === "completed") {
        return "done";
    }
    return undefined;
}
function statusLabel(status) {
    return Task_1.TASK_STATUSES.find((item) => item.id === status)?.label ?? status;
}
function isIgnoredSection(title) {
    const normalized = normalizeComparable(title);
    return normalized === "archive" || normalized === "archived";
}
function parseTaskManagerMetadata(line) {
    const match = line.match(exports.TASK_MANAGER_COMMENT_PATTERN);
    if (!match) {
        return {};
    }
    try {
        const parsed = JSON.parse(match[1]);
        if (!parsed || typeof parsed !== "object") {
            return {};
        }
        const record = parsed;
        return {
            id: readString(record.id),
            status: readStatus(record.status),
            projectName: readString(record.projectName ?? record.projeto ?? record.project),
            projectPath: readString(record.projectPath),
            relatedNoteName: readString(record.relatedNoteName ?? record.noteName ?? record.nota),
            relatedNotePath: readString(record.relatedNotePath ?? record.notePath),
            priority: readPriority(record.priority ?? record.prioridade),
            size: readSize(record.size ?? record.tamanho),
            createdAt: readString(record.createdAt ?? record.criado_em),
            updatedAt: readString(record.updatedAt ?? record.atualizado_em),
            startedAt: readString(record.startedAt ?? record.data_inicio),
            completedAt: readString(record.completedAt ?? record.data_termino),
        };
    }
    catch {
        return {};
    }
}
function removeTaskManagerMetadata(line) {
    return line.replace(exports.TASK_MANAGER_COMMENT_PATTERN, "").trimEnd();
}
function normalizeComparable(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}
function readString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function readStatus(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    return Task_1.TASK_STATUSES.some((status) => status.id === value) ? value : undefined;
}
function readPriority(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    return Task_1.TASK_PRIORITIES.some((priority) => priority.id === value) ? value : undefined;
}
function readSize(value) {
    const numberValue = typeof value === "number" ? value : Number(value);
    return Task_1.TASK_SIZES.includes(numberValue) ? numberValue : undefined;
}

},
"./infrastructure/markdown/MarkdownKanbanParser.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownKanbanParser = void 0;
exports.findSectionForLine = findSectionForLine;
const id_1 = require("../../utils/id");
const markdownFormat_1 = require("./markdownFormat");
class MarkdownKanbanParser {
    constructor(resolveWikiLink) {
        this.resolveWikiLink = resolveWikiLink;
    }
    parse(path, content) {
        const normalizedContent = content.replace(/\r\n/g, "\n");
        const lines = normalizedContent.split("\n");
        const name = fileNameWithoutExtension(path);
        const id = (0, id_1.slugify)(path);
        const sections = this.parseSections(lines);
        const tasks = this.parseTasks(id, name, path, lines, sections);
        const unknownColumns = sections
            .filter((section) => !section.normalizedStatus && !(0, markdownFormat_1.isIgnoredSection)(section.title))
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
    parseSections(lines) {
        const sections = [];
        lines.forEach((line, index) => {
            const heading = line.match(markdownFormat_1.HEADING_PATTERN);
            if (!heading) {
                return;
            }
            if (sections.length > 0) {
                sections[sections.length - 1].endLine = index - 1;
            }
            const title = heading[1].trim();
            sections.push({
                title,
                normalizedStatus: (0, markdownFormat_1.normalizeStatusTitle)(title),
                startLine: index,
                endLine: lines.length - 1,
            });
        });
        return sections;
    }
    parseTasks(kanbanId, kanbanName, path, lines, sections) {
        const tasks = [];
        lines.forEach((line, index) => {
            const match = line.match(markdownFormat_1.TASK_LINE_PATTERN);
            if (!match) {
                return;
            }
            const section = findSectionForLine(sections, index);
            if (section && (0, markdownFormat_1.isIgnoredSection)(section.title)) {
                return;
            }
            const checked = match[2].toLowerCase() === "x";
            const body = match[3];
            const metadata = (0, markdownFormat_1.parseTaskManagerMetadata)(body);
            const dueDate = body.match(markdownFormat_1.DUE_DATE_PATTERN)?.[1];
            const status = metadata.status ?? section?.normalizedStatus ?? statusFromCheckbox(checked);
            const cleanName = extractTaskName(body);
            const wikiLinks = extractWikiLinks(cleanName).map((link) => this.resolveLink(link, path));
            const firstProjectLink = wikiLinks.find((link) => link.isProject);
            const firstNoteLink = wikiLinks.find((link) => !link.isProject);
            const id = metadata.id ?? (0, id_1.stableFallbackTaskId)(path, index);
            const createdAt = metadata.createdAt ?? metadata.updatedAt ?? new Date(0).toISOString();
            const updatedAt = metadata.updatedAt ?? createdAt;
            const projectName = metadata.projectName ?? firstProjectLink?.name;
            const projectPath = metadata.projectPath ?? firstProjectLink?.path;
            const relatedNoteName = metadata.relatedNoteName ?? firstNoteLink?.name;
            const relatedNotePath = metadata.relatedNotePath ?? firstNoteLink?.path;
            const task = {
                id,
                name: cleanName,
                projectId: projectName ? (0, id_1.slugify)(projectName) : undefined,
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
    resolveLink(linkText, sourcePath) {
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
exports.MarkdownKanbanParser = MarkdownKanbanParser;
function findSectionForLine(sections, line) {
    return sections.find((section) => section.startLine <= line && section.endLine >= line);
}
function statusFromCheckbox(checked) {
    return checked ? "done" : "backlog";
}
function extractTaskName(body) {
    return (0, markdownFormat_1.removeTaskManagerMetadata)(body)
        .replace(markdownFormat_1.DUE_DATE_PATTERN, "")
        .replace(/\s+/g, " ")
        .trim();
}
function extractWikiLinks(value) {
    const links = [];
    const pattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;
    while ((match = pattern.exec(value)) !== null) {
        const link = match[1]?.trim();
        if (link) {
            links.push(link);
        }
    }
    return links;
}
function fileNameWithoutExtension(path) {
    return path.split("/").pop()?.replace(/\.md$/i, "") ?? path;
}

},
"./infrastructure/markdown/MarkdownKanbanSerializer.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownKanbanSerializer = void 0;
exports.serializeTaskLine = serializeTaskLine;
const markdownFormat_1 = require("./markdownFormat");
const MarkdownKanbanParser_1 = require("./MarkdownKanbanParser");
class MarkdownKanbanSerializer {
    constructor() {
        this.parser = new MarkdownKanbanParser_1.MarkdownKanbanParser();
    }
    createTask(document, task) {
        const lines = [...document.lines];
        this.insertTaskLineAtTop(lines, task.status, serializeTaskLine(task));
        return joinLines(lines);
    }
    updateTask(document, task) {
        const lines = [...document.lines];
        const current = findTaskLine(document, task);
        const line = serializeTaskLine(task);
        if (!current) {
            this.insertTaskLine(lines, task.status, line);
            return joinLines(lines);
        }
        const preserveUnknownColumn = current.task.isFromUnknownColumn && current.task.status === task.status;
        const targetStatus = preserveUnknownColumn ? undefined : task.status;
        if (targetStatus && (0, markdownFormat_1.normalizeStatusTitle)(current.task.sourceColumnTitle) !== targetStatus) {
            lines.splice(current.task.sourceLine, 1);
            this.insertTaskLine(lines, targetStatus, line);
            return joinLines(lines);
        }
        lines[current.task.sourceLine] = line;
        return joinLines(lines);
    }
    deleteTask(document, task) {
        const lines = [...document.lines];
        const current = findTaskLine(document, task);
        if (!current) {
            return joinLines(lines);
        }
        lines.splice(current.task.sourceLine, 1);
        return joinLines(lines);
    }
    moveTask(document, task, targetTaskId, placement) {
        const lines = [...document.lines];
        const current = findTaskLine(document, task);
        const target = targetTaskId ? findTaskById(document, targetTaskId) : undefined;
        const line = serializeTaskLine(task);
        if (!current) {
            this.insertTaskLine(lines, task.status, line);
            return joinLines(lines);
        }
        lines.splice(current.task.sourceLine, 1);
        if (target && target.task.sourcePath === task.sourcePath) {
            let insertAt = target.task.sourceLine;
            if (current.task.sourceLine < insertAt) {
                insertAt -= 1;
            }
            if (placement === "after") {
                insertAt += 1;
            }
            lines.splice(insertAt, 0, line);
            return joinLines(lines);
        }
        this.insertTaskLine(lines, task.status, line);
        return joinLines(lines);
    }
    insertTaskLine(lines, status, line) {
        const parsed = this.parser.parse("__draft__.md", joinLines(lines));
        const section = parsed.sections.find((item) => item.normalizedStatus === status);
        if (!section) {
            this.createSection(lines, status, line);
            return;
        }
        const insertAt = findSectionInsertIndex(lines, section.startLine, section.endLine);
        lines.splice(insertAt, 0, line);
    }
    insertTaskLineAtTop(lines, status, line) {
        const parsed = this.parser.parse("__draft__.md", joinLines(lines));
        const section = parsed.sections.find((item) => item.normalizedStatus === status);
        if (!section) {
            this.createSection(lines, status, line);
            return;
        }
        const insertAt = findSectionTopInsertIndex(lines, section.startLine, section.endLine);
        lines.splice(insertAt, 0, line);
    }
    createSection(lines, status, line) {
        const insertAt = findSafeAppendIndex(lines);
        const block = [`## ${(0, markdownFormat_1.statusLabel)(status)}`, "", line, ""];
        if (insertAt > 0 && lines[insertAt - 1]?.trim()) {
            block.unshift("");
        }
        lines.splice(insertAt, 0, ...block);
    }
}
exports.MarkdownKanbanSerializer = MarkdownKanbanSerializer;
function findSectionTopInsertIndex(lines, startLine, endLine) {
    let insertAt = startLine + 1;
    while (insertAt <= endLine && !lines[insertAt]?.trim()) {
        insertAt += 1;
    }
    return insertAt;
}
function serializeTaskLine(task) {
    const checkbox = task.status === "done" ? "x" : " ";
    const due = task.dueDate ? ` @{${task.dueDate}}` : "";
    const metadata = {
        id: task.id,
        status: task.status,
        projectName: task.projectName,
        projectPath: task.projectPath,
        relatedNoteName: task.relatedNoteName,
        relatedNotePath: task.relatedNotePath,
        priority: task.priority,
        size: task.size,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
    };
    const compactMetadata = removeUndefined(metadata);
    return `- [${checkbox}] ${sanitizeTaskName(task.name)}${due} %% task-manager: ${JSON.stringify(compactMetadata)} %%`;
}
function findTaskLine(document, task) {
    const byPersistentId = document.tasks.find((item) => item.task.hasPersistentId && item.task.id === task.id);
    if (byPersistentId) {
        return byPersistentId;
    }
    return document.tasks.find((item) => item.task.id === task.id || item.task.sourceLine === task.sourceLine);
}
function findTaskById(document, taskId) {
    return document.tasks.find((item) => item.task.id === taskId);
}
function findSectionInsertIndex(lines, startLine, endLine) {
    let insertAt = endLine + 1;
    for (let index = endLine; index > startLine; index -= 1) {
        const line = lines[index] ?? "";
        if (!line.trim()) {
            insertAt = index;
            continue;
        }
        if (!markdownFormat_1.TASK_LINE_PATTERN.test(line) && !markdownFormat_1.HEADING_PATTERN.test(line) && line.trim().startsWith("**")) {
            insertAt = index + 1;
            break;
        }
        break;
    }
    return Math.max(insertAt, startLine + 1);
}
function findSafeAppendIndex(lines) {
    const settingsIndex = lines.findIndex((line) => markdownFormat_1.KANBAN_SETTINGS_PATTERN.test(line));
    const archiveIndex = lines.findIndex((line) => {
        const heading = line.match(markdownFormat_1.HEADING_PATTERN);
        return heading ? heading[1].trim().toLowerCase() === "archive" : false;
    });
    const candidates = [settingsIndex, archiveIndex].filter((index) => index >= 0);
    if (candidates.length === 0) {
        return trimTrailingBlankLines(lines.length, lines);
    }
    return trimTrailingBlankLines(Math.min(...candidates), lines);
}
function trimTrailingBlankLines(index, lines) {
    let nextIndex = index;
    while (nextIndex > 0 && !lines[nextIndex - 1]?.trim()) {
        nextIndex -= 1;
    }
    return nextIndex;
}
function sanitizeTaskName(value) {
    return value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}
function removeUndefined(metadata) {
    return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}
function joinLines(lines) {
    return lines.join("\n");
}

},
"./main.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const TaskManagerStore_1 = require("./application/services/TaskManagerStore");
const TaskManagerSettings_1 = require("./settings/TaskManagerSettings");
const TaskManagerSettingTab_1 = require("./settings/TaskManagerSettingTab");
const TaskManagerView_1 = require("./views/TaskManagerView");
class TaskManagerPlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.settings = TaskManagerSettings_1.DEFAULT_SETTINGS;
    }
    async onload() {
        await this.loadSettings();
        this.store = new TaskManagerStore_1.TaskManagerStore(this.app, () => this.settings);
        await this.store.start();
        this.registerView(TaskManagerView_1.TASK_MANAGER_VIEW_TYPE, (leaf) => {
            if (!this.store) {
                throw new Error("Task Manager store is not ready.");
            }
            return new TaskManagerView_1.TaskManagerView(leaf, this.store, () => this.settings);
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
                new obsidian_1.Notice("Task Manager: Kanbans recarregados.");
            },
        });
        this.addSettingTab(new TaskManagerSettingTab_1.TaskManagerSettingTab(this));
    }
    onunload() {
        this.store?.stop();
        this.app.workspace.detachLeavesOfType(TaskManagerView_1.TASK_MANAGER_VIEW_TYPE);
    }
    async updateSettings(patch) {
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
    async activateView() {
        const leaves = this.app.workspace.getLeavesOfType(TaskManagerView_1.TASK_MANAGER_VIEW_TYPE);
        const existing = leaves[0];
        if (existing) {
            this.app.workspace.revealLeaf(existing);
            return;
        }
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.setViewState({ type: TaskManagerView_1.TASK_MANAGER_VIEW_TYPE, active: true });
        this.app.workspace.revealLeaf(leaf);
    }
    async loadSettings() {
        const loaded = (await this.loadData());
        this.settings = {
            ...TaskManagerSettings_1.DEFAULT_SETTINGS,
            ...loaded,
            cardFields: {
                ...TaskManagerSettings_1.DEFAULT_SETTINGS.cardFields,
                ...loaded?.cardFields,
            },
        };
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
}
exports.default = TaskManagerPlugin;

},
"./modals/ConfirmModal.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmModal = void 0;
const obsidian_1 = require("obsidian");
class ConfirmModal extends obsidian_1.Modal {
    constructor(app, title, message, onConfirm) {
        super(app);
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
    }
    onOpen() {
        this.contentEl.empty();
        this.titleEl.setText(this.title);
        this.contentEl.createEl("p", { text: this.message });
        new obsidian_1.Setting(this.contentEl)
            .addButton((button) => {
            button.setButtonText("Cancelar").onClick(() => this.close());
        })
            .addButton((button) => {
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
exports.ConfirmModal = ConfirmModal;

},
"./modals/TaskDetailsModal.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDetailsModal = void 0;
const obsidian_1 = require("obsidian");
const Task_1 = require("../domain/models/Task");
const date_1 = require("../utils/date");
const wikiLinkInput_1 = require("../utils/wikiLinkInput");
const ConfirmModal_1 = require("./ConfirmModal");
class TaskDetailsModal extends obsidian_1.Modal {
    constructor(app, options) {
        super(app);
        this.options = options;
        this.selectedSize = options.task.size;
    }
    onOpen() {
        const { task, snapshot } = this.options;
        this.contentEl.empty();
        this.titleEl.setText("Task");
        const titleValues = {
            name: task.name,
            projectName: task.projectName ?? "",
            relatedNoteName: task.relatedNoteName ?? "",
            status: task.status,
            priority: task.priority ?? "",
            dueDate: (0, date_1.toDateInputValue)(task.dueDate),
            startedAt: (0, date_1.toDateTimeInputValue)(task.startedAt),
            completedAt: (0, date_1.toDateTimeInputValue)(task.completedAt),
        };
        const projectListId = `tm-projects-${task.id}`;
        const noteListId = `tm-notes-${task.id}`;
        this.createDatalist(projectListId, unique(snapshot.tasks.map((item) => item.projectName)));
        this.appendDatalistOptions(projectListId, this.getProjectNoteNames());
        this.createDatalist(noteListId, unique(snapshot.tasks.map((item) => item.relatedNoteName)));
        this.appendDatalistOptions(noteListId, this.getAllNoteNames());
        new obsidian_1.Setting(this.contentEl).setName("Nome").addText((text) => {
            text.setValue(titleValues.name).onChange((value) => {
                titleValues.name = value;
            });
            text.inputEl.addClass("task-manager-modal-wide-input");
            (0, wikiLinkInput_1.installWikiLinkInputBehavior)(this.app, text.inputEl);
        });
        new obsidian_1.Setting(this.contentEl).setName("Projeto").addText((text) => {
            text.setValue(titleValues.projectName).onChange((value) => {
                titleValues.projectName = value;
            });
            text.inputEl.setAttr("list", projectListId);
            text.inputEl.addClass("task-manager-modal-wide-input");
            (0, wikiLinkInput_1.installWikiLinkInputBehavior)(this.app, text.inputEl);
        });
        new obsidian_1.Setting(this.contentEl).setName("Nota relacionada").addText((text) => {
            text.setValue(titleValues.relatedNoteName).onChange((value) => {
                titleValues.relatedNoteName = value;
            });
            text.inputEl.setAttr("list", noteListId);
            text.inputEl.addClass("task-manager-modal-wide-input");
            (0, wikiLinkInput_1.installWikiLinkInputBehavior)(this.app, text.inputEl);
        });
        new obsidian_1.Setting(this.contentEl).setName("Status").addDropdown((dropdown) => {
            for (const status of Task_1.TASK_STATUSES) {
                dropdown.addOption(status.id, status.label);
            }
            dropdown.setValue(titleValues.status).onChange((value) => {
                titleValues.status = value;
            });
        });
        new obsidian_1.Setting(this.contentEl).setName("Prioridade").addDropdown((dropdown) => {
            dropdown.addOption("", "Sem prioridade");
            for (const priority of Task_1.TASK_PRIORITIES) {
                dropdown.addOption(priority.id, priority.label);
            }
            dropdown.setValue(titleValues.priority).onChange((value) => {
                titleValues.priority = value;
            });
        });
        this.renderSizeSelector();
        new obsidian_1.Setting(this.contentEl).setName("Prazo").addText((text) => {
            text.inputEl.type = "date";
            text.setValue(titleValues.dueDate).onChange((value) => {
                titleValues.dueDate = value;
            });
        });
        new obsidian_1.Setting(this.contentEl).setName("Data de inicio").addText((text) => {
            text.inputEl.type = "datetime-local";
            text.setValue(titleValues.startedAt).onChange((value) => {
                titleValues.startedAt = value;
            });
        });
        new obsidian_1.Setting(this.contentEl).setName("Data de termino").addText((text) => {
            text.inputEl.type = "datetime-local";
            text.setValue(titleValues.completedAt).onChange((value) => {
                titleValues.completedAt = value;
            });
        });
        const meta = this.contentEl.createDiv("task-manager-modal-meta");
        meta.createSpan({ text: `Kanban: ${task.kanbanName}` });
        meta.createSpan({ text: `ID: ${task.hasPersistentId ? task.id : "sera persistido ao salvar"}` });
        new obsidian_1.Setting(this.contentEl)
            .addButton((button) => {
            button
                .setButtonText("Excluir")
                .setWarning()
                .onClick(() => {
                new ConfirmModal_1.ConfirmModal(this.app, "Excluir task", `Excluir "${task.name}"?`, async () => {
                    await this.options.onDelete(task);
                    this.close();
                }).open();
            });
        })
            .addButton((button) => {
            button.setButtonText("Cancelar").onClick(() => this.close());
        })
            .addButton((button) => {
            button
                .setButtonText("Salvar")
                .setCta()
                .onClick(async () => {
                if (!titleValues.name.trim()) {
                    new obsidian_1.Notice("Task Manager: informe o nome da task.");
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
                    priority: emptyToUndefined(titleValues.priority),
                    size: this.selectedSize,
                    dueDate: emptyToUndefined(titleValues.dueDate),
                    startedAt: (0, date_1.fromDateTimeInputValue)(titleValues.startedAt),
                    completedAt: (0, date_1.fromDateTimeInputValue)(titleValues.completedAt),
                });
                this.close();
            });
        });
    }
    renderSizeSelector() {
        const setting = new obsidian_1.Setting(this.contentEl).setName("Tamanho");
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
        for (const size of Task_1.TASK_SIZES) {
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
    refreshSizeButtons(container) {
        for (const button of Array.from(container.querySelectorAll(".task-manager-size-button"))) {
            const value = button.dataset.size ? Number(button.dataset.size) : undefined;
            button.toggleClass("is-active", value === this.selectedSize);
            if (!value) {
                button.toggleClass("is-active", !this.selectedSize);
            }
        }
    }
    createDatalist(id, values) {
        const datalist = this.contentEl.createEl("datalist", { attr: { id } });
        for (const value of values) {
            datalist.createEl("option", { attr: { value } });
        }
    }
    appendDatalistOptions(id, values) {
        const datalist = this.contentEl.querySelector(`#${id}`);
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
    getProjectNoteNames() {
        return this.app.vault
            .getMarkdownFiles()
            .filter((file) => isProjectPath(file.path))
            .map((file) => file.basename)
            .sort((a, b) => a.localeCompare(b));
    }
    getAllNoteNames() {
        return this.app.vault
            .getMarkdownFiles()
            .map((file) => file.basename)
            .sort((a, b) => a.localeCompare(b));
    }
}
exports.TaskDetailsModal = TaskDetailsModal;
function unique(values) {
    return Array.from(new Set(values.filter((value) => Boolean(value)))).sort((a, b) => a.localeCompare(b));
}
function emptyToUndefined(value) {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}
function resolveNoteReference(app, value, projectsOnly) {
    const linkTarget = normalizeReferenceValue(value);
    if (!linkTarget) {
        return undefined;
    }
    const direct = app.metadataCache.getFirstLinkpathDest(linkTarget, "");
    const file = direct ?? findMarkdownByName(app, linkTarget);
    if (!(file instanceof obsidian_1.TFile)) {
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
function normalizeReferenceValue(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    const wikiMatch = trimmed.match(/^\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]$/);
    return (wikiMatch?.[1] ?? trimmed).trim();
}
function findMarkdownByName(app, value) {
    const normalized = value.toLowerCase();
    return app.vault
        .getMarkdownFiles()
        .find((file) => file.basename.toLowerCase() === normalized || file.path.replace(/\.md$/i, "").toLowerCase() === normalized);
}
function isProjectPath(path) {
    return (0, obsidian_1.normalizePath)(path).toLowerCase().startsWith("projects/");
}

},
"./settings/TaskManagerSettings.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
exports.DEFAULT_SETTINGS = {
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

},
"./settings/TaskManagerSettingTab.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskManagerSettingTab = void 0;
const obsidian_1 = require("obsidian");
class TaskManagerSettingTab extends obsidian_1.PluginSettingTab {
    constructor(plugin) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Task Manager" });
        new obsidian_1.Setting(containerEl)
            .setName("Pasta dos Kanbans")
            .setDesc("Pasta do vault onde ficam os arquivos Markdown de Kanban.")
            .addText((text) => {
            text
                .setPlaceholder("Tasks")
                .setValue(this.plugin.settings.kanbanFolder)
                .onChange((value) => this.updatePluginSettings({ kanbanFolder: value.trim() || "Tasks" }));
        });
        new obsidian_1.Setting(containerEl)
            .setName("Arquivos incluidos")
            .setDesc("Opcional. Separe padrões por virgula. Exemplo: Tasks - *.md")
            .addText((text) => {
            text.setValue(this.plugin.settings.includeFiles).onChange((value) => this.updatePluginSettings({ includeFiles: value }));
        });
        new obsidian_1.Setting(containerEl)
            .setName("Arquivos excluidos")
            .setDesc("Opcional. Separe padrões por virgula.")
            .addText((text) => {
            text.setValue(this.plugin.settings.excludeFiles).onChange((value) => this.updatePluginSettings({ excludeFiles: value }));
        });
        new obsidian_1.Setting(containerEl).setName("Formato visual das datas").addDropdown((dropdown) => {
            dropdown
                .addOption("DD/MM", "DD/MM")
                .addOption("DD/MM/YYYY", "DD/MM/YYYY")
                .addOption("YYYY-MM-DD", "YYYY-MM-DD")
                .setValue(this.plugin.settings.dateFormat)
                .onChange((value) => this.updatePluginSettings({ dateFormat: value }));
        });
        new obsidian_1.Setting(containerEl)
            .setName("Automacao de data_inicio")
            .setDesc("Preencher quando a task entrar em Doing pela primeira vez.")
            .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.autoStartDate).onChange((value) => this.updatePluginSettings({ autoStartDate: value }));
        });
        new obsidian_1.Setting(containerEl)
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
    renderCardFieldToggle(label, key) {
        new obsidian_1.Setting(this.containerEl).setName(label).addToggle((toggle) => {
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
    async updatePluginSettings(patch) {
        await this.plugin.updateSettings(patch);
    }
}
exports.TaskManagerSettingTab = TaskManagerSettingTab;

},
"./utils/date.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nowIso = nowIso;
exports.todayIsoDate = todayIsoDate;
exports.isIsoDate = isIsoDate;
exports.toDateInputValue = toDateInputValue;
exports.toDateTimeInputValue = toDateTimeInputValue;
exports.fromDateTimeInputValue = fromDateTimeInputValue;
exports.formatDate = formatDate;
function nowIso() {
    return new Date().toISOString();
}
function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
function isIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function toDateInputValue(value) {
    if (!value) {
        return "";
    }
    return value.slice(0, 10);
}
function toDateTimeInputValue(value) {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}
function fromDateTimeInputValue(value) {
    if (!value) {
        return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }
    return date.toISOString();
}
function formatDate(value, format) {
    if (!value) {
        return "";
    }
    const [year, month, day] = value.slice(0, 10).split("-");
    if (!year || !month || !day) {
        return value;
    }
    if (format === "DD/MM/YYYY") {
        return `${day}/${month}/${year}`;
    }
    if (format === "DD/MM") {
        return `${day}/${month}`;
    }
    return `${year}-${month}-${day}`;
}

},
"./utils/id.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createId = createId;
exports.slugify = slugify;
exports.stableFallbackTaskId = stableFallbackTaskId;
function createId(prefix) {
    const cryptoSource = globalThis.crypto;
    if (cryptoSource?.randomUUID) {
        return `${prefix}_${cryptoSource.randomUUID()}`;
    }
    const random = Math.random().toString(36).slice(2, 10);
    const time = Date.now().toString(36);
    return `${prefix}_${time}_${random}`;
}
function slugify(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function stableFallbackTaskId(path, line) {
    return `legacy_${slugify(path)}_${line + 1}`;
}

},
"./utils/wikiLinkInput.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installWikiLinkInputBehavior = installWikiLinkInputBehavior;
const obsidian_1 = require("obsidian");
function installWikiLinkInputBehavior(app, inputEl) {
    new WikiLinkInputSuggest(app, inputEl);
    inputEl.addEventListener("keydown", (event) => {
        if (event.key !== "[") {
            return;
        }
        const start = inputEl.selectionStart ?? inputEl.value.length;
        const end = inputEl.selectionEnd ?? start;
        if (start > 0 && inputEl.value[start - 1] === "[") {
            return;
        }
        event.preventDefault();
        const selectedText = inputEl.value.slice(start, end);
        const insertion = selectedText ? `[[${selectedText}]]` : "[[";
        inputEl.setRangeText(insertion, start, end, "end");
        if (selectedText) {
            inputEl.setSelectionRange(start + insertion.length, start + insertion.length);
        }
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    });
}
class WikiLinkInputSuggest extends obsidian_1.AbstractInputSuggest {
    constructor(app, inputEl) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }
    getSuggestions(inputStr) {
        const active = getActiveWikiQuery(this.inputEl, inputStr);
        if (!active) {
            return [];
        }
        const query = active.query.toLowerCase();
        return this.app.vault
            .getMarkdownFiles()
            .filter((file) => {
            const target = `${file.basename} ${file.path}`.toLowerCase();
            return target.includes(query);
        })
            .slice(0, 20);
    }
    renderSuggestion(file, el) {
        el.createDiv({ cls: "task-manager-suggest-title", text: file.basename });
        el.createDiv({ cls: "task-manager-suggest-path", text: file.path });
    }
    selectSuggestion(file) {
        const active = getActiveWikiQuery(this.inputEl, this.inputEl.value);
        if (!active) {
            return;
        }
        const replacement = `[[${file.basename}]]`;
        this.inputEl.setRangeText(replacement, active.start, active.end, "end");
        this.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        this.close();
    }
}
function getActiveWikiQuery(inputEl, value) {
    const cursor = inputEl.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const openIndex = beforeCursor.lastIndexOf("[[");
    if (openIndex < 0) {
        return undefined;
    }
    const closeIndex = beforeCursor.lastIndexOf("]]");
    if (closeIndex > openIndex) {
        return undefined;
    }
    return {
        start: openIndex,
        end: cursor,
        query: value.slice(openIndex + 2, cursor),
    };
}

},
"./views/TaskManagerView.js": function(require, module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskManagerView = exports.TASK_MANAGER_VIEW_TYPE = void 0;
const obsidian_1 = require("obsidian");
const Task_1 = require("../domain/models/Task");
const date_1 = require("../utils/date");
const wikiLinkInput_1 = require("../utils/wikiLinkInput");
const ConfirmModal_1 = require("../modals/ConfirmModal");
const TaskDetailsModal_1 = require("../modals/TaskDetailsModal");
exports.TASK_MANAGER_VIEW_TYPE = "kanban-task-manager-view";
const NO_PROJECT_FILTER = "__none__";
class TaskManagerView extends obsidian_1.ItemView {
    constructor(leaf, store, getSettings) {
        super(leaf);
        this.store = store;
        this.getSettings = getSettings;
        this.snapshot = { kanbans: [], tasks: [], loadedAt: "" };
        this.activeMainTab = "kanban";
        this.activeKanbanId = "all";
        this.activeProjectFilterId = "all";
        this.taskSearchQuery = "";
        this.sortField = "manual";
        this.sortDirection = "asc";
        this.doneCompact = false;
        this.dashboardDateField = "completedAt";
        this.dashboardRange = "30";
    }
    getViewType() {
        return exports.TASK_MANAGER_VIEW_TYPE;
    }
    getDisplayText() {
        return "Task Manager";
    }
    getIcon() {
        return "list-checks";
    }
    async onOpen() {
        this.contentEl.addClass("task-manager-view");
        this.unsubscribe = this.store.subscribe((snapshot) => {
            this.snapshot = snapshot;
            this.ensureValidSelection();
            this.render();
        });
    }
    async onClose() {
        this.unsubscribe?.();
    }
    render() {
        this.ensureValidSelection();
        this.contentEl.empty();
        const shell = this.contentEl.createDiv("task-manager-shell");
        const header = shell.createDiv("task-manager-header");
        header.createEl("h2", { text: "Task Manager" });
        const reloadButton = header.createEl("button", {
            cls: "clickable-icon task-manager-icon-button",
            attr: { "aria-label": "Recarregar", type: "button" },
        });
        (0, obsidian_1.setIcon)(reloadButton, "refresh-cw");
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
    renderTopBar(shell) {
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
    renderKanbanScopeSelect(container) {
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
    renderProjectScopeSelect(container) {
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
            this.activeProjectFilterId = select.value;
            this.selectedProjectId = undefined;
            this.render();
        });
    }
    renderKanban(shell) {
        if (this.snapshot.kanbans.length === 0) {
            shell.createDiv({ cls: "task-manager-empty", text: "Nenhum Kanban encontrado na pasta configurada." });
            return;
        }
        const visibleTasks = this.getVisibleTasks();
        const board = shell.createDiv("task-manager-board");
        for (const status of Task_1.TASK_STATUSES) {
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
                (0, obsidian_1.setIcon)(toggleButton, this.doneCompact ? "maximize-2" : "minimize-2");
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
    renderKanbanControls(shell) {
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
                const nextInput = this.contentEl.querySelector(".task-manager-filter-input");
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
            this.sortField = sortSelect.value;
            this.render();
        });
        const directionButton = sort.createEl("button", {
            cls: "clickable-icon task-manager-icon-button",
            attr: {
                "aria-label": this.sortDirection === "asc" ? "Ordem ascendente" : "Ordem descendente",
                type: "button",
            },
        });
        (0, obsidian_1.setIcon)(directionButton, this.sortDirection === "asc" ? "arrow-up-narrow-wide" : "arrow-down-wide-narrow");
        directionButton.addEventListener("click", () => {
            this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
            this.render();
        });
    }
    renderQuickAdd(column) {
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
        (0, wikiLinkInput_1.installWikiLinkInputBehavior)(this.app, input);
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
            }
            catch (error) {
                new obsidian_1.Notice(`Task Manager: erro ao criar task. ${errorMessage(error)}`);
            }
        });
    }
    renderTaskCard(list, task, compact = false) {
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
            }
            catch (error) {
                new obsidian_1.Notice(`Task Manager: erro ao reordenar task. ${errorMessage(error)}`);
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
        const metaTop = [];
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
        const metaBottom = [];
        if (settings.cardFields.priority && task.priority) {
            metaBottom.push(priorityLabel(task.priority));
        }
        if (settings.cardFields.size && task.size) {
            metaBottom.push(`T ${task.size}`);
        }
        if (settings.cardFields.dueDate && task.dueDate) {
            metaBottom.push((0, date_1.formatDate)(task.dueDate, settings.dateFormat));
        }
        if (compact && task.completedAt) {
            metaBottom.push(`Fim ${(0, date_1.formatDate)(task.completedAt, settings.dateFormat)}`);
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
    renderProjects(shell) {
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
    renderProjectDetails(layout, project) {
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
    renderDashboard(shell) {
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
        const relatedNotes = unique(tasks
            .map((task) => task.relatedNotePath ?? task.relatedNoteName)
            .filter((value) => Boolean(value)));
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
    renderDashboardControls(shell) {
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
            this.dashboardDateField = fieldSelect.value;
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
            this.dashboardRange = rangeSelect.value;
            this.render();
        });
    }
    renderMetrics(container, metrics) {
        const grid = container.createDiv("task-manager-detail-metrics");
        this.renderDashboardMetric(grid, "Tasks", `${metrics.completedTasks}/${metrics.totalTasks}`);
        this.renderDashboardMetric(grid, "Progresso", `${metrics.taskProgressPercentage}%`);
        this.renderDashboardMetric(grid, "Pontos", `${metrics.completedPoints}/${metrics.totalPoints}`);
        this.renderDashboardMetric(grid, "Pontos", `${metrics.pointProgressPercentage}%`);
    }
    renderProjectTaskCard(container, task) {
        const card = container.createDiv("task-manager-project-task-card");
        card.addEventListener("click", () => this.openTask(task));
        const icon = card.createSpan("task-manager-project-task-status");
        icon.toggleClass("is-done", task.status === "done");
        (0, obsidian_1.setIcon)(icon, task.status === "done" ? "circle-check" : "circle");
        const content = card.createDiv("task-manager-project-task-content");
        content.createDiv({ cls: "task-manager-project-task-title", text: task.name });
        const meta = [
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
            meta.push({ type: "text", text: (0, date_1.formatDate)(task.dueDate, this.getSettings().dateFormat) });
        }
        this.renderInlineMeta(content, "task-manager-project-task-meta", meta, task);
    }
    renderDashboardMetric(container, label, value) {
        const item = container.createDiv("task-manager-metric");
        item.createEl("span", { text: label });
        item.createEl("strong", { text: value });
    }
    renderProgressBar(container, value) {
        const bar = container.createDiv("task-manager-progress");
        bar.createDiv("task-manager-progress-fill").style.width = `${Math.max(0, Math.min(100, value))}%`;
    }
    attachDropTarget(column, status) {
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
            }
            catch (error) {
                new obsidian_1.Notice(`Task Manager: erro ao mover task. ${errorMessage(error)}`);
            }
        });
    }
    openTask(task) {
        new TaskDetailsModal_1.TaskDetailsModal(this.app, {
            task,
            snapshot: this.snapshot,
            onSave: (current, patch) => this.store.updateTask(current, patch),
            onDelete: (current) => this.store.deleteTask(current),
        }).open();
    }
    renderInlineMeta(container, className, parts, task) {
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
    renderNoteLink(container, task, label, path) {
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
    async openNoteReference(label, path, sourcePath) {
        try {
            if (path) {
                const file = this.app.vault.getAbstractFileByPath(path);
                if (file instanceof obsidian_1.TFile) {
                    await this.app.workspace.getLeaf(false).openFile(file);
                    return;
                }
            }
            await this.app.workspace.openLinkText(label, sourcePath, false);
        }
        catch (error) {
            new obsidian_1.Notice(`Task Manager: erro ao abrir nota. ${errorMessage(error)}`);
        }
    }
    getDraggedTask(event) {
        const taskId = event.dataTransfer?.getData("text/task-id") || event.dataTransfer?.getData("text/plain");
        return this.snapshot.tasks.find((item) => item.id === taskId);
    }
    openTaskMenu(event, task) {
        const menu = new obsidian_1.Menu();
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
                new ConfirmModal_1.ConfirmModal(this.app, "Excluir task", `Excluir "${task.name}"?`, async () => {
                    await this.store.deleteTask(task);
                }).open();
            });
        });
        menu.showAtMouseEvent(event);
    }
    createTabButton(container, label, active, onClick) {
        const button = container.createEl("button", {
            cls: "task-manager-tab",
            text: label,
            attr: { type: "button" },
        });
        button.toggleClass("is-active", active);
        button.addEventListener("click", onClick);
    }
    getVisibleTasks() {
        const query = normalizeSearch(this.taskSearchQuery);
        const tasks = this.getScopedTasks();
        if (!query) {
            return tasks;
        }
        return tasks.filter((task) => normalizeSearch(task.name).includes(query));
    }
    getKanbanScopedTasks() {
        if (this.activeKanbanId === "all") {
            return this.snapshot.tasks;
        }
        return this.snapshot.tasks.filter((task) => task.kanbanId === this.activeKanbanId);
    }
    getScopedTasks() {
        const tasks = this.getKanbanScopedTasks();
        if (this.activeProjectFilterId === "all") {
            return tasks;
        }
        if (this.activeProjectFilterId === NO_PROJECT_FILTER) {
            return tasks.filter((task) => !task.projectId);
        }
        return tasks.filter((task) => task.projectId === this.activeProjectFilterId);
    }
    getOrderedColumnTasks(tasks) {
        if (this.sortField === "manual") {
            return tasks;
        }
        return [...tasks].sort((a, b) => compareTaskDate(a, b, this.sortField, this.sortDirection));
    }
    getActiveProjectReference() {
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
    getDashboardDateFilteredTasks(tasks, field) {
        return tasks.filter((task) => isInDashboardRange(task[field], this.dashboardRange));
    }
    getDashboardWeekCount(tasks, field) {
        if (this.dashboardRange !== "all") {
            return Math.max(1, Number(this.dashboardRange) / 7);
        }
        const dates = tasks
            .map((task) => task[field])
            .filter((value) => Boolean(value))
            .map((value) => new Date(value).getTime())
            .filter((value) => !Number.isNaN(value))
            .sort((a, b) => a - b);
        if (dates.length < 2) {
            return 1;
        }
        const days = Math.max(1, (dates[dates.length - 1] - dates[0]) / 86400000);
        return Math.max(1, days / 7);
    }
    ensureValidSelection() {
        if (this.activeKanbanId !== "all" && !this.snapshot.kanbans.some((kanban) => kanban.id === this.activeKanbanId)) {
            this.activeKanbanId = "all";
        }
        const kanbanScopedTasks = this.getKanbanScopedTasks();
        const projects = this.store.getProgressService().getProjects(kanbanScopedTasks);
        const hasNoProjectTasks = kanbanScopedTasks.some((task) => !task.projectId);
        const projectFilterExists = this.activeProjectFilterId === "all" ||
            (this.activeProjectFilterId === NO_PROJECT_FILTER && hasNoProjectTasks) ||
            projects.some((project) => project.id === this.activeProjectFilterId);
        if (!projectFilterExists) {
            this.activeProjectFilterId = "all";
        }
    }
}
exports.TaskManagerView = TaskManagerView;
function priorityLabel(priority) {
    if (priority === "media") {
        return "Media";
    }
    if (priority === "critica") {
        return "Critica";
    }
    return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : "";
}
function statusLabel(status) {
    return Task_1.TASK_STATUSES.find((item) => item.id === status)?.label ?? status;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function getDropPlacement(event, target) {
    const rect = target.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}
function compareTaskDate(a, b, field, direction) {
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
function parseSortableDate(value) {
    if (!value) {
        return undefined;
    }
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? undefined : time;
}
function normalizeSearch(value) {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}
function isInDashboardRange(value, range) {
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
function dashboardFieldLabel(field) {
    return field === "startedAt" ? "inicio" : "termino";
}
function formatDecimal(value) {
    if (!Number.isFinite(value)) {
        return "0";
    }
    return value.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: value > 0 && value < 10 ? 1 : 0,
    });
}
function unique(values) {
    return Array.from(new Set(values));
}

}
};
var __ktm_cache = {};
function __ktm_dirname(id) {
  var index = id.lastIndexOf("/");
  return index === -1 ? "." : id.slice(0, index);
}
function __ktm_normalize(id) {
  var parts = id.replace(/\\/g, "/").split("/");
  var stack = [];
  for (var i = 0; i < parts.length; i += 1) {
    var part = parts[i];
    if (!part || part === ".") continue;
    if (part === "..") stack.pop(); else stack.push(part);
  }
  return "./" + stack.join("/");
}
function __ktm_resolve(request, parentId) {
  if (request[0] !== ".") return request;
  var base = __ktm_dirname(parentId);
  var resolved = __ktm_normalize(base + "/" + request);
  if (__ktm_modules[resolved]) return resolved;
  if (__ktm_modules[resolved + ".js"]) return resolved + ".js";
  if (__ktm_modules[resolved + "/index.js"]) return resolved + "/index.js";
  return resolved;
}
function __ktm_require(request, parentId) {
  var id = __ktm_resolve(request, parentId || "./main.js");
  if (id[0] !== ".") return require(id);
  if (__ktm_cache[id]) return __ktm_cache[id].exports;
  var factory = __ktm_modules[id];
  if (!factory) throw new Error("Cannot find module " + request + " resolved as " + id);
  var module = { exports: {} };
  __ktm_cache[id] = module;
  factory(function(childRequest) { return __ktm_require(childRequest, id); }, module, module.exports);
  return module.exports;
}
module.exports = __ktm_require("./main.js");
