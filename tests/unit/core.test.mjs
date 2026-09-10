import assert from "node:assert/strict";
import test from "node:test";
import {
  canSpell,
  cellsFor,
  classifyWord,
  dailyRoute,
  emptyProgress,
  endlessPoolIndex,
  levelStars,
  normalizeWord,
  validateProgress
} from "../../src/core.js";

test("normalizes Russian words with NFC, trim, uppercase, and Ё mapping", () => {
  assert.equal(normalizeWord("  ёж  "), "ЕЖ");
});

test("checks letter bags without allowing repeated letters", () => {
  assert.equal(canSpell("ТОК", ["О", "К", "Т"]), true);
  assert.equal(canSpell("ТОТ", ["О", "К", "Т"]), false);
});

test("classifies target, bonus, duplicate, invalid, and short words", () => {
  const level = {
    id: 1,
    letters: ["О", "К", "Т"],
    words: [{ word: "ТОК", x: 0, y: 0, direction: 0 }],
    bonus: ["КОТ"]
  };
  const progress = emptyProgress();
  assert.equal(classifyWord(level, progress, "ток").kind, "target");
  progress.found.push("ТОК");
  assert.equal(classifyWord(level, progress, "ТОК").kind, "duplicate");
  assert.equal(classifyWord(level, progress, "КОТ").kind, "bonus");
  assert.equal(classifyWord(level, progress, "ТОО").kind, "invalid");
  assert.equal(classifyWord(level, progress, "КО").kind, "short");
});

test("builds crossing cells and sanitizes progress to the level contract", () => {
  const level = {
    id: 1,
    letters: ["А", "Б", "В"],
    words: [
      { word: "АБ", x: 0, y: 0, direction: 0 },
      { word: "АВ", x: 0, y: 0, direction: 1 }
    ],
    bonus: []
  };
  const cells = cellsFor(level);
  assert.equal(cells.length, 3);
  assert.equal(cells.find((cell) => cell.key === "0,0").words.length, 2);
  const progress = validateProgress(level, { found: ["АБ", "NOPE"], revealed: ["9,9"], hints: -2 });
  assert.deepEqual(progress.found, ["АБ"]);
  assert.deepEqual(progress.revealed, []);
  assert.equal(progress.hints, 0);
});

test("keeps daily route deterministic and bounded", () => {
  const first = dailyRoute("2026-09-10", 304);
  assert.deepEqual(first, dailyRoute("2026-09-10", 304));
  assert.equal(first.length, 3);
  assert.equal(first.every((id) => id >= 32 && id < 304), true);
});

test("permutes the endless catalog without repeats during one cycle", () => {
  const values = Array.from({ length: 2000 }, (_, index) => endlessPoolIndex(index + 1, 2000));
  assert.equal(new Set(values).size, 2000);
  assert.equal(Math.min(...values), 1);
  assert.equal(Math.max(...values), 2000);
});

test("awards stars according to hint count", () => {
  assert.equal(levelStars(0), 3);
  assert.equal(levelStars(2), 2);
  assert.equal(levelStars(3), 1);
});