import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = path.join(pluginRoot, "dist");
const outputPath = path.join(pluginRoot, "main.js");

const modules = new Map();

for (const filePath of walk(distRoot)) {
  if (!filePath.endsWith(".js")) {
    continue;
  }

  const relative = toModuleId(path.relative(distRoot, filePath));
  modules.set(relative, fs.readFileSync(filePath, "utf8"));
}

if (!modules.has("./main.js")) {
  throw new Error("dist/main.js was not found. Run TypeScript build first.");
}

const moduleEntries = Array.from(modules.entries())
  .map(([id, code]) => `${JSON.stringify(id)}: function(require, module, exports) {\n${code}\n}`)
  .join(",\n");

const bundle = `/* Kanban Task Manager for Obsidian */\n` +
`var __ktm_modules = {\n${moduleEntries}\n};\n` +
`var __ktm_cache = {};\n` +
`function __ktm_dirname(id) {\n` +
`  var index = id.lastIndexOf("/");\n` +
`  return index === -1 ? "." : id.slice(0, index);\n` +
`}\n` +
`function __ktm_normalize(id) {\n` +
`  var parts = id.replace(/\\\\/g, "/").split("/");\n` +
`  var stack = [];\n` +
`  for (var i = 0; i < parts.length; i += 1) {\n` +
`    var part = parts[i];\n` +
`    if (!part || part === ".") continue;\n` +
`    if (part === "..") stack.pop(); else stack.push(part);\n` +
`  }\n` +
`  return "./" + stack.join("/");\n` +
`}\n` +
`function __ktm_resolve(request, parentId) {\n` +
`  if (request[0] !== ".") return request;\n` +
`  var base = __ktm_dirname(parentId);\n` +
`  var resolved = __ktm_normalize(base + "/" + request);\n` +
`  if (__ktm_modules[resolved]) return resolved;\n` +
`  if (__ktm_modules[resolved + ".js"]) return resolved + ".js";\n` +
`  if (__ktm_modules[resolved + "/index.js"]) return resolved + "/index.js";\n` +
`  return resolved;\n` +
`}\n` +
`function __ktm_require(request, parentId) {\n` +
`  var id = __ktm_resolve(request, parentId || "./main.js");\n` +
`  if (id[0] !== ".") return require(id);\n` +
`  if (__ktm_cache[id]) return __ktm_cache[id].exports;\n` +
`  var factory = __ktm_modules[id];\n` +
`  if (!factory) throw new Error("Cannot find module " + request + " resolved as " + id);\n` +
`  var module = { exports: {} };\n` +
`  __ktm_cache[id] = module;\n` +
`  factory(function(childRequest) { return __ktm_require(childRequest, id); }, module, module.exports);\n` +
`  return module.exports;\n` +
`}\n` +
`module.exports = __ktm_require("./main.js");\n`;

fs.writeFileSync(outputPath, bundle);
console.log(`Bundled ${modules.size} modules into ${outputPath}`);

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(entryPath);
      continue;
    }

    yield entryPath;
  }
}

function toModuleId(relativePath) {
  return `./${relativePath.split(path.sep).join("/")}`;
}
