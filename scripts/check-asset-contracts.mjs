import fs from "node:fs";
import path from "node:path";
import { ASSET_MANIFEST } from "../src/asset-manifest.js";

const root = process.cwd();
const errors = [];
const keys = ["compass", "locked", "mapRouteCompass", "mapNodeCurrent", "mapNodeComplete", "mapNodeLocked", "routeCompass", "routeMap", "routeCampfire", "routeComplete", "routeLocked", "tutorialHand"];
for (const key of keys) {
  const relative = "assets/UI/" + ASSET_MANIFEST.ui.icons[key] + ".png";
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    errors.push("Missing illustration asset: " + relative);
    continue;
  }
  const buffer = fs.readFileSync(file);
  if (buffer.length > 300 * 1024) errors.push(relative + " is " + Math.round(buffer.length / 1024) + " KB, over the 300 KB asset limit");
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(pngSignature)) {
    errors.push(relative + " is not a valid PNG");
    continue;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width < 1 || height < 1 || width !== height || width > 512 || height > 512) errors.push(relative + " must be a square PNG no larger than 512x512, got " + width + "x" + height);
}
if (errors.length) {
  console.error("Illustration asset contract failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("Illustration asset contract passed: " + keys.length + " square PNG assets within 512px/300KB limits.");
}