import fs from "node:fs";
import { cellsFor, classifyWord, dailyRoute, emptyProgress, endlessPoolIndex, levelDifficulty, normalizeWord } from "../src/core.js";

const root = process.cwd();
const errors = [];
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const campaign = read("levels.json");
const endless = read("endless-levels.json");
let totals = { cells: 0, targets: 0, bonuses: 0 };

function add(message) {
  errors.push(message);
}

function validateCatalog(kind, levels) {
  const ids = new Set();
  for (const level of levels) {
    const id = level?.id;
    if (!Number.isInteger(id) || id < 1 || id > levels.length) add(kind + " invalid id " + id);
    else if (ids.has(id)) add(kind + " duplicate id " + id);
    ids.add(id);

    if (!Number.isInteger(level?.width) || !Number.isInteger(level?.height) || level.width < 1 || level.height < 1) {
      add(kind + " " + id + " invalid grid");
    }

    let cells = [];
    try {
      cells = cellsFor(level);
    } catch (error) {
      add(kind + " " + id + " " + error.message);
    }
    totals.cells += cells.length;
    for (const cell of cells) {
      if (cell.x < 0 || cell.y < 0 || cell.x >= level.width || cell.y >= level.height) {
        add(kind + " " + id + " out-of-bounds cell " + cell.key);
      }
    }

    const entries = [
      ...(Array.isArray(level?.words) ? level.words.map(entry => ["target", entry?.word]) : []),
      ...(Array.isArray(level?.bonus) ? level.bonus.map(word => ["bonus", word]) : [])
    ];
    const seenWords = new Set();
    for (const [type, value] of entries) {
      const word = normalizeWord(value);
      if (word !== value) add(kind + " " + id + " non-canonical " + type + " word " + JSON.stringify(value));
      if (seenWords.has(word)) add(kind + " " + id + " duplicate word " + word);
      seenWords.add(word);
      if (type === "target") totals.targets++;
      else totals.bonuses++;
      const result = classifyWord(level, emptyProgress(), word);
      if (result.kind !== type) add(kind + " " + id + " classifies " + word + " as " + result.kind + ", expected " + type);
    }

    try {
      const metrics = levelDifficulty(level);
      if (metrics.occupiedCells !== cells.length || metrics.wordCount !== (level.words ?? []).length) {
        add(kind + " " + id + " difficulty metrics do not match the grid");
      }
    } catch (error) {
      add(kind + " " + id + " invalid difficulty metrics: " + error.message);
    }
  }

  for (let id = 1; id <= levels.length; id++) {
    if (!ids.has(id)) add(kind + " missing id " + id);
  }
}

validateCatalog("campaign", campaign);
validateCatalog("endless", endless);

const pool = new Set();
for (let stage = 1; stage <= endless.length; stage++) {
  const index = endlessPoolIndex(stage, endless.length);
  if (pool.has(index)) add("endless pool repeats template " + index + " at stage " + stage);
  pool.add(index);
}
if (pool.size !== endless.length) add("endless pool covers " + pool.size + " of " + endless.length + " templates");

for (let day = 0; day < 1000; day++) {
  const key = new Date(Date.UTC(2090, 0, day + 1)).toISOString().slice(0, 10);
  const route = dailyRoute(key, campaign.length);
  if (route.length !== 3 || new Set(route).size !== 3 || route.some(index => index < 32 || index >= campaign.length)) {
    add("daily route out of contract for " + key + ": " + route.join(","));
  }
}

if (errors.length) {
  console.error("Gameplay content check failed:");
  for (const error of errors.slice(0, 50)) console.error("- " + error);
  if (errors.length > 50) console.error("- ... " + (errors.length - 50) + " more");
  process.exitCode = 1;
} else {
  console.log("Gameplay content check passed: " + campaign.length + " campaign, " + endless.length + " endless, " + totals.cells + " occupied cells, " + totals.targets + " target words, " + totals.bonuses + " bonus words, " + pool.size + " unique endless templates.");
}
