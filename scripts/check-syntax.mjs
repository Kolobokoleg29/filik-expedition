import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const sourceDir = path.join(root, "src");
const scriptDir = path.join(root, "scripts");
const files = [
  ...fs.readdirSync(sourceDir).filter(file => file.endsWith(".js")).map(file => path.join(sourceDir, file)),
  ...fs.readdirSync(scriptDir).filter(file => file.endsWith(".mjs")).map(file => path.join(scriptDir, file))
].sort();
let failed = false;

for (const fullPath of files) {
  const result = spawnSync(process.execPath, ["--check", fullPath], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("Syntax check passed: " + files.length + " project modules.");
