import builtins from "builtin-modules";
import esbuild from "esbuild";
import { fileURLToPath } from "node:url";

const production = process.argv[2] === "production";
const absWorkingDir = fileURLToPath(new URL(".", import.meta.url));
const entryPoint = fileURLToPath(new URL("./src/main.ts", import.meta.url));
const outfile = fileURLToPath(new URL("./main.js", import.meta.url));

const context = await esbuild.context({
  absWorkingDir,
  banner: {
    js: "/* Task Manager for Obsidian */",
  },
  bundle: true,
  entryPoints: [entryPoint],
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
    ...builtins,
  ],
  format: "cjs",
  logLevel: "info",
  minify: production,
  outfile,
  sourcemap: production ? false : "inline",
  target: "es2020",
  treeShaking: true,
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
  console.log("Task Manager build is watching for changes...");
}
