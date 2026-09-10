import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const errors = [];
const required = ["index.html", "levels.json", "endless-levels.json", "build.json", "live-config.json", "assets/UI/app_icon.png"];

if (!fs.existsSync(dist)) {
  console.error("Budget check failed: dist does not exist. Run npm run build first.");
  process.exitCode = 1;
} else {
  for (const file of required) {
    if (!fs.existsSync(path.join(dist, file))) errors.push("Missing build output: " + file);
  }

  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else files.push(full);
    }
  };
  visit(dist);

  const sizeOf = (file) => fs.existsSync(file) ? fs.statSync(file).size : 0;
  const jsFiles = files.filter((file) => file.endsWith(".js"));
  const cssFiles = files.filter((file) => file.endsWith(".css"));
  const jsBytes = jsFiles.reduce((sum, file) => sum + sizeOf(file), 0);
  const cssBytes = cssFiles.reduce((sum, file) => sum + sizeOf(file), 0);
  const htmlBytes = sizeOf(path.join(dist, "index.html"));
  const totalBytes = files.reduce((sum, file) => sum + sizeOf(file), 0);
  const assetFiles = files.filter((file) => file.startsWith(path.join(dist, "assets" + path.sep)));
  const largestAsset = assetFiles.reduce((best, file) => sizeOf(file) > best.bytes ? { file, bytes: sizeOf(file) } : best, { file: "", bytes: 0 });
  const initialBytes = jsBytes + cssBytes + htmlBytes;
  const kb = (bytes) => Math.round(bytes / 1024);

  if (jsBytes > 300 * 1024) errors.push("Initial JS budget exceeded: " + kb(jsBytes) + " KB > 300 KB");
  if (cssBytes > 120 * 1024) errors.push("Initial CSS budget exceeded: " + kb(cssBytes) + " KB > 120 KB");
  if (initialBytes > 550 * 1024) errors.push("Initial payload budget exceeded: " + kb(initialBytes) + " KB > 550 KB");
  if (totalBytes > 30 * 1024 * 1024) errors.push("Total dist budget exceeded: " + kb(totalBytes) + " KB > 30720 KB");
  if (largestAsset.bytes > 300 * 1024) errors.push("Largest asset budget exceeded: " + kb(largestAsset.bytes) + " KB > 300 KB");

  if (errors.length) {
    console.error("Budget check failed:");
    for (const error of errors) console.error("- " + error);
    process.exitCode = 1;
  } else {
    console.log("Budget check passed: initial " + kb(initialBytes) + " KB, total " + kb(totalBytes) + " KB, largest asset " + path.relative(dist, largestAsset.file) + " " + kb(largestAsset.bytes) + " KB.");
  }
}
