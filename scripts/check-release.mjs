import fs from "node:fs";
import path from "node:path";
import { normalizeConfig } from "../src/config.js";

const root = process.cwd();
const errors = [];
const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  } catch (error) {
    errors.push("Unable to read JSON: " + file + " (" + error.message + ")");
    return null;
  }
};
const readText = (file) => {
  try {
    return fs.readFileSync(path.join(root, file), "utf8");
  } catch (error) {
    errors.push("Unable to read file: " + file + " (" + error.message + ")");
    return "";
  }
};
const requireFile = (file) => {
  if (!fs.existsSync(path.join(root, file))) errors.push("Missing release input: " + file);
};

const packageJson = readJson("package.json");
const build = readJson("build.json");
const levels = readJson("levels.json");
const endless = readJson("endless-levels.json");
const liveConfig = readJson("live-config.json");
const distBuild = fs.existsSync(path.join(root, "dist/build.json")) ? readJson("dist/build.json") : null;
const distConfig = fs.existsSync(path.join(root, "dist/live-config.json")) ? readJson("dist/live-config.json") : null;

for (const file of ["index.html", "build.json", "live-config.json", "levels.json", "endless-levels.json", "assets/UI/app_icon.png", "dist/index.html", "dist/build.json", "dist/live-config.json", "dist/assets/UI/app_icon.png"]) {
  requireFile(file);
}

if (packageJson && build) {
  if (!/^\d+\.\d+\.\d+$/.test(String(build.version || ""))) errors.push("build.json version must be strict semver: " + build.version);
  if (packageJson.version !== build.version) errors.push("package.json and build.json versions differ: " + packageJson.version + " vs " + build.version);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(String(build.buildDate || ""))) errors.push("build.json buildDate must be UTC ISO-8601: " + build.buildDate);
  if (!Number.isInteger(build.levels) || build.levels < 1) errors.push("build.json levels must be a positive integer");
  if (!Number.isInteger(build.endlessLevels) || build.endlessLevels < 1) errors.push("build.json endlessLevels must be a positive integer");
}
if (build && Array.isArray(levels) && build.levels !== levels.length) errors.push("build.json levels count does not match levels.json");
if (build && Array.isArray(endless) && build.endlessLevels !== endless.length) errors.push("build.json endlessLevels count does not match endless-levels.json");
if (build && distBuild && JSON.stringify(build) !== JSON.stringify(distBuild)) errors.push("dist/build.json differs from root build.json");
if (liveConfig && distConfig && JSON.stringify(liveConfig) !== JSON.stringify(distConfig)) errors.push("dist/live-config.json differs from root live-config.json");

if (liveConfig) {
  const normalized = normalizeConfig(liveConfig);
  if (JSON.stringify(normalized) !== JSON.stringify(liveConfig)) errors.push("live-config.json contains values that runtime normalization would change");
  if (liveConfig.commerceEnabled === true && liveConfig.commerceClientMode !== "client-v1") errors.push("commerceClientMode must be client-v1 when commerceEnabled is true");
  const productEntries = Object.entries(liveConfig.catalog || {});
  const seenProducts = new Set();
  for (const [key, id] of productEntries) {
    if (typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) || /^(todo|test|replace|changeme|your[-_])/i.test(id)) errors.push("Invalid catalog product ID for " + key);
    if (seenProducts.has(id)) errors.push("Duplicate catalog product ID: " + id);
    seenProducts.add(id);
  }
  const leaderboardId = liveConfig.leaderboards?.endless;
  if (typeof leaderboardId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(leaderboardId) || /^(todo|test|replace|changeme|your[-_])/i.test(leaderboardId)) errors.push("Invalid endless leaderboard ID");
  const serialized = JSON.stringify(liveConfig);
  if (/-----BEGIN|sk_(?:live|test)_|AIza[0-9A-Za-z_-]{20,}|xox[baprs]-|gh[pousr]_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]+/i.test(serialized)) errors.push("Possible credential or private token found in live-config.json");
}

const distIndex = readText("dist/index.html");
if (/localhost|127\.0\.0\.1/i.test(distIndex)) errors.push("Production index.html contains a local development host");
if (fs.existsSync(path.join(root, "dist/purchases-catalog.json"))) errors.push("Production dist must not contain the local SDK purchases catalog");
const platformSource = readText("src/platform.js");
if (!/['"]\/sdk\.js['"]/.test(platformSource)) errors.push("Yandex SDK must be loaded from the relative /sdk.js path on Yandex hosting");
if (/sdk\.games\.s3\.yandex\.net\/sdk\.js/i.test(platformSource)) errors.push("Production runtime must not contain an absolute Yandex S3 SDK URL");
if (!/YaGames\.init\s*\(/.test(platformSource)) errors.push("Yandex SDK init contract is missing");
if (!/LoadingAPI\?\.ready\s*\(\)/.test(platformSource)) errors.push("Yandex LoadingAPI.ready contract is missing");

const externalUrlPattern=/https?:\/\/[^\s"''<>]+/gi;
const releaseFiles=[];
const collectReleaseFiles=(directory)=>{
  if(!fs.existsSync(directory))return;
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())collectReleaseFiles(file);
    else if(/\.(?:html?|js|json|css)$/i.test(entry.name))releaseFiles.push(file);
  }
};
collectReleaseFiles(path.join(root,"dist"));
for(const file of releaseFiles){
  const text=fs.readFileSync(file,"utf8");
  const urls=[...text.matchAll(externalUrlPattern)].map(match=>match[0]);
  if(urls.length)errors.push("Production dist contains an absolute external URL in "+path.relative(root,file)+": "+[...new Set(urls)].join(", "));
}
if (errors.length) {
  console.error("Release preflight failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("Release preflight passed: version " + build.version + ", campaign " + build.levels + ", endless " + build.endlessLevels + ", products " + Object.keys(liveConfig.catalog).length + ".");
}