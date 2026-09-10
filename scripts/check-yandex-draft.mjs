import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "docs/yandex-draft.json");
const errors = [];
let draft = null;
try {
  draft = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (error) {
  errors.push("Unable to read docs/yandex-draft.json: " + error.message);
}
const text = (key) => typeof draft?.[key] === "string" ? draft[key].trim() : "";
const length = (key) => [...text(key)].length;
const range = (key, min, max) => {
  const count = length(key);
  if (count < min || count > max) errors.push(key + " length " + count + " is outside " + min + "-" + max);
};
if (draft) {
  if (!/^\d+\.\d+\.\d+$/.test(String(draft.version || ""))) errors.push("version must be strict semver");
  if (!Array.isArray(draft.platforms) || !draft.platforms.includes("mobile") || !draft.platforms.includes("desktop")) errors.push("platforms must include desktop and mobile");
  if (draft.orientation !== "portrait") errors.push("orientation must remain portrait for the current launch plan");
  if (JSON.stringify(draft.languages) !== JSON.stringify(["ru"])) errors.push("languages must list only the currently implemented Russian localization");
  if (draft.cloudSaves !== true) errors.push("cloudSaves must be enabled");
  if (draft.deferredPublication !== true) errors.push("deferredPublication must remain enabled before first moderation");
  range("title", 1, 50);
  range("seoDescription", 50, 160);
  range("about", 100, 1000);
  range("shortDescription", 1, 70);
  range("howToPlay", 100, 1000);
  range("developerComment", 1, 2048);
  if (!/^[А-ЯЁA-Z]/.test(text("title"))) errors.push("title must begin with an uppercase letter");
  if (!/[.!?]$/.test(text("seoDescription"))) errors.push("seoDescription must end with punctuation");
  if (text("seoDescription").includes(text("title"))) errors.push("seoDescription must not duplicate the title");
  if (/^\s*[«\"].*[»\"]\s*$/.test(text("shortDescription"))) errors.push("shortDescription must not be enclosed entirely in quotes");
  if (/бесплатн|на русском языке/i.test(text("shortDescription"))) errors.push("shortDescription contains a disallowed promotional phrase");
  const tags = Array.isArray(draft.tags) ? draft.tags : [];
  if (!tags.length || tags.length > 20 || new Set(tags).size !== tags.length) errors.push("tags must contain 1-20 unique values");
  const keywords = text("keywords");
  if (keywords.length > 100) errors.push("keywords length " + keywords.length + " exceeds 100");
  if (keywords !== keywords.toLowerCase()) errors.push("keywords must be lowercase");
  if (keywords.split(",").some((entry) => !entry.trim())) errors.push("keywords must not contain empty comma-separated entries");
  if (!Array.isArray(draft.categories) || draft.categories.length < 1 || draft.categories.length > 2) errors.push("categories must contain 1-2 values");
}
if (errors.length) {
  console.error("Yandex draft check failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("Yandex draft check passed: title " + length("title") + ", SEO " + length("seoDescription") + ", about " + length("about") + ", instructions " + length("howToPlay") + ", keywords " + text("keywords").length + "/100.");
}