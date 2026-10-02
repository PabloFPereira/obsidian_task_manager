import fs from "node:fs";

const targetVersion = process.env.npm_package_version;

if (!targetVersion) {
  throw new Error("npm_package_version is not available.");
}

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
manifest.version = targetVersion;
fs.writeFileSync("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
