import fs from "node:fs";
import path from "node:path";
import { ASSET_MANIFEST } from "../../../../src/asset-manifest.js";

const root = process.cwd();
const errors = [];
const read = (file) => {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { errors.push("Missing " + file); return null; }
  try { return JSON.parse(fs.readFileSync(full, "utf8")); }
  catch (error) { errors.push("Invalid JSON " + file + ": " + error.message); return null; }
};
const normalize = (value) => String(value ?? "").normalize("NFC").toUpperCase().replaceAll("Ё", "Е");
const canSpell = (word, letters) => {
  const available = new Map();
  for (const letter of normalize(letters)) available.set(letter, (available.get(letter) ?? 0) + 1);
  for (const letter of normalize(word)) {
    const count = available.get(letter) ?? 0;
    if (!count) return false;
    available.set(letter, count - 1);
  }
  return true;
};
const assertFile = (file, label) => {
  if (!fs.existsSync(path.join(root, file))) errors.push("Missing " + label + ": " + file);
};
const assertIdSet = (items, label, expectedCount) => {
  if (items.length !== expectedCount) errors.push(label + " count is " + items.length + ", expected " + expectedCount);
  const ids = items.map((item) => item?.id);
  const expected = new Set(Array.from({ length: expectedCount }, (_, index) => index + 1));
  const actual = new Set(ids);
  if (actual.size !== ids.length) errors.push(label + " contains duplicate IDs");
  for (const id of expected) if (!actual.has(id)) errors.push(label + " is missing ID " + id);
};

const build = read("build.json");
const campaign = read("levels.json");
const endless = read("endless-levels.json");

if (build && !/^\d+\.\d+\.\d+$/.test(String(build.version ?? ""))) errors.push("build.json version must use MAJOR.MINOR.PATCH");
if (!Array.isArray(campaign)) errors.push("levels.json must be an array");
if (!Array.isArray(endless)) errors.push("endless-levels.json must be an array");

if (Array.isArray(campaign)) {
  assertIdSet(campaign, "Campaign", 304);
  campaign.forEach((level, index) => {
    const id = index + 1;
    if (!normalize(level?.letters)) errors.push("Campaign level " + id + " has no letters");
    if (!Array.isArray(level?.words) || !level.words.length) errors.push("Campaign level " + id + " has no words");
    for (const word of [...(level?.words ?? []), ...(level?.bonus ?? [])]) {
      const value = typeof word === "string" ? word : word?.word;
      if (!normalize(value)) errors.push("Campaign level " + id + " contains an empty word");
      else if (!canSpell(value, level.letters)) errors.push("Campaign level " + id + " cannot spell " + JSON.stringify(value));
    }
  });
}
if (Array.isArray(endless)) {
  assertIdSet(endless, "Endless", 2000);
  endless.forEach((level) => {
    const id = level?.id;
    if (!normalize(level?.letters)) errors.push("Endless level " + id + " has no letters");
    if (!Array.isArray(level?.words) || !level.words.length) errors.push("Endless level " + id + " has no words");
    for (const word of [...(level?.words ?? []), ...(level?.bonus ?? [])]) {
      const value = typeof word === "string" ? word : word?.word;
      if (!normalize(value)) errors.push("Endless level " + id + " contains an empty word");
      else if (!canSpell(value, level.letters)) errors.push("Endless level " + id + " cannot spell " + JSON.stringify(value));
    }
  });
}
if (build && Array.isArray(campaign) && build.levels !== campaign.length) errors.push("build.json levels is " + build.levels + ", expected " + campaign.length);
if (build && Array.isArray(endless) && build.endlessLevels !== endless.length) errors.push("build.json endlessLevels is " + build.endlessLevels + ", expected " + endless.length);

const chapterEntries = Array.isArray(ASSET_MANIFEST.chapters) ? ASSET_MANIFEST.chapters : [];
const chapterImages = chapterEntries.map((entry) => entry?.file);
if (chapterEntries.length !== 38) errors.push("Manifest chapter count is " + chapterEntries.length + ", expected 38");
if (chapterEntries.length) assertIdSet(chapterEntries, "Manifest chapter", 38);
for (const chapter of chapterEntries) {
  assertFile("assets/UI/" + chapter.portrait, "chapter image");
  assertFile("assets/UI/" + chapter.wide, "wide chapter image");
}

const contentSource = fs.existsSync(path.join(root, "src/content.js")) ? fs.readFileSync(path.join(root, "src/content.js"), "utf8") : "";
const companionIds = [...contentSource.matchAll(/"id"\s*:\s*"([^"]+)"/g)].map((match) => match[1]);
if (companionIds.length !== 12) errors.push("Companion count is " + companionIds.length + ", expected 12");
if ((ASSET_MANIFEST.companions?.poses ?? []).length !== 6) errors.push("Manifest companion pose count must be 6");
for (const id of companionIds) {
  for (const pose of ASSET_MANIFEST.companions?.poses ?? []) {
    assertFile("assets/UI/companions/" + id + "-" + pose + ".png", "companion pose");
  }
}

const artifactFiles = ASSET_MANIFEST.artifacts?.files ?? {};
const artifactImages = Object.values(artifactFiles);
if (artifactImages.length !== 38) errors.push("Manifest artifact count is " + artifactImages.length + ", expected 38");
for (const image of artifactImages) assertFile("assets/UI/" + ASSET_MANIFEST.artifacts.root + "/" + image, "artifact image");

const captainFiles = ASSET_MANIFEST.captains?.files ?? {};
if (Object.keys(captainFiles).length !== 8) errors.push("Manifest captain count is " + Object.keys(captainFiles).length + ", expected 8");
for (const image of Object.values(captainFiles)) assertFile("assets/UI/" + image, "captain image");

const manifestAssets = [
  ...Object.values(ASSET_MANIFEST.ui?.icons ?? {}).map((file) => "assets/UI/" + file + ".png"),
  ...Object.values(ASSET_MANIFEST.ui?.shop ?? {}).map((file) => "assets/UI/" + file + ".png"),
  ...Object.values(ASSET_MANIFEST.backgrounds ?? {}).map((file) => "assets/UI/" + file),
  ...chapterEntries.flatMap((entry) => ["assets/UI/" + entry.portrait, "assets/UI/" + entry.wide]),
  ...artifactImages.map((file) => "assets/UI/" + ASSET_MANIFEST.artifacts.root + "/" + file),
  ...Object.values(captainFiles).map((file) => "assets/UI/" + file)
];
for (const file of new Set(manifestAssets)) assertFile(file, "manifest asset");

const runtimeFiles = [
  "index.html",
  ...fs.readdirSync(path.join(root, "src"))
    .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
    .map((file) => path.join("src", file))
];
const runtimeAssetRefs = new Set();
for (const file of runtimeFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  for (const match of source.matchAll(new RegExp("(?:../|./)?assets/[A-Za-z0-9._/-]+", "g"))) {
    let ref = match[0];
    while (ref.startsWith('"') || ref.startsWith("'")) ref = ref.slice(1);
    while (ref.startsWith("../")) ref = ref.slice(3);
    while (ref.startsWith("./")) ref = ref.slice(2);
    if (ref && !ref.endsWith("/")) runtimeAssetRefs.add(ref);
  }
}
for (const ref of runtimeAssetRefs) {
  if (!fs.existsSync(path.join(root, ref))) errors.push("Missing runtime asset reference: " + ref);
}
if (errors.length) {
  console.error("Content validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("Content validation passed: " + campaign.length + " campaign, " + endless.length + " endless, " + chapterImages.length + " chapters, " + companionIds.length + " companions, " + artifactImages.length + " artifacts.");
}
