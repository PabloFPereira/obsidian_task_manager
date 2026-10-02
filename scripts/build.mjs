import esbuild from "esbuild";
import { builtinModules } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const tempRoot = path.join(os.tmpdir(), "kanban-task-manager-build");
const tempSrc = path.join(tempRoot, "src");
const tempMain = path.join(tempRoot, "main.js");
const finalMain = path.join(pluginRoot, "main.js");

fs.rmSync(tempRoot, { force: true, recursive: true });
fs.mkdirSync(tempRoot, { recursive: true });
fs.cpSync(path.join(pluginRoot, "src"), tempSrc, { recursive: true });

await esbuild.build({
  absWorkingDir: tempRoot,
  banner: {
    js: "/* Kanban Task Manager for Obsidian */",
  },
  bundle: true,
  entryPoints: [path.join(tempSrc, "main.ts")],
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules,
  ],
  format: "cjs",
  logLevel: "info",
  minify: true,
  outfile: tempMain,
  platform: "browser",
  sourcemap: false,
  target: "es2020",
  treeShaking: true,
});

fs.copyFileSync(tempMain, finalMain);
console.log(`Built ${finalMain}`);
