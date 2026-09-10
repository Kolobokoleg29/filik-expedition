import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  } catch (error) {
    errors.push("Unable to read " + file + ": " + error.message);
    return null;
  }
};

const config = readJson("live-config.json");
const catalog = readJson("purchases-catalog.json");
const configured = new Set(Object.values(config?.catalog || {}));
const seen = new Set();
const fields = ["title", "description", "price", "priceCurrencyCode", "priceValue"];

if (!Array.isArray(catalog) || !catalog.length) errors.push("purchases-catalog.json must contain at least one product");
for (const item of Array.isArray(catalog) ? catalog : []) {
  const id = typeof item?.id === "string" ? item.id : "";
  if (!id || !configured.has(id)) errors.push("Catalog product is not configured in live-config.json: " + (id || "unknown"));
  if (seen.has(id)) errors.push("Duplicate local catalog product ID: " + id);
  seen.add(id);
  for (const field of fields) {
    if (typeof item?.[field] !== "string" || !item[field].trim()) errors.push("Missing catalog field " + field + " for " + (id || "unknown"));
  }
}
for (const id of configured) if (!seen.has(id)) errors.push("Configured product is missing from purchases-catalog.json: " + id);

if (errors.length) {
  console.error("Local Yandex SDK catalog check failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("Local Yandex SDK catalog check passed: " + catalog.length + " configured products.");
}
