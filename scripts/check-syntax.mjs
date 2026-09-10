import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const sourceDir = path.join(root, "src");
const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith(".js")).sort();
let failed = false;

for (const file of files) {
  const fullPath = path.join(sourceDir, file);
  const result = spawnSync(process.execPath, ["--check", fullPath], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("Syntax check passed: " + files.length + " source modules.");