import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "purchases-catalog.json");
const destination = path.join(root, "dist", "purchases-catalog.json");

if (!fs.existsSync(source)) throw new Error("Missing purchases-catalog.json");
if (!fs.existsSync(path.dirname(destination))) throw new Error("Missing dist directory. Run npm run build first.");
fs.copyFileSync(source, destination);
console.log("SDK dev catalog prepared: dist/purchases-catalog.json");
