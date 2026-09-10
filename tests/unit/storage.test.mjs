import assert from "node:assert/strict";
import test from "node:test";
import { freshState, mergeStates, migrateLegacy, SAVE_KEY, sanitizeState, SaveStore } from "../../src/storage.js";

class MemoryStorage {
  constructor(entries = {}) { this.entries = new Map(Object.entries(entries)); }
  getItem(key) { return this.entries.get(key) ?? null; }
  setItem(key, value) { this.entries.set(key, String(value)); }
}

test("creates a safe fresh state and persists revisions", () => {
  const storage = new MemoryStorage();
  const store = new SaveStore(storage);
  assert.equal(store.state.version, 5);
  const initialRevision = store.state.revision;
  store.save();
  assert.equal(store.state.revision, initialRevision + 1);
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).version, 5);
});

test("sanitizes invalid state version and bounded values", () => {
  const state = sanitizeState({ version: 4, coins: 999999999999 });
  assert.equal(state.version, 5);
  assert.equal(state.coins, 120);
  const valid = sanitizeState({ version: 5, coins: 999999999999, completed: [1, 1, 305], settings: { sound: false } });
  assert.equal(valid.coins, 100000000);
  assert.deepEqual(valid.completed, [1]);
  assert.equal(valid.settings.sound, false);
});

test("merges progress monotonically while using the newer economy snapshot", () => {
  const local = freshState();
  local.updatedAt = 100;
  local.revision = 2;
  local.economyRevision = 2;
  local.completed = [1];
  local.stars = { 1: 2 };
  local.coins = 200;
  const remote = freshState();
  remote.updatedAt = 200;
  remote.revision = 1;
  remote.economyRevision = 1;
  remote.completed = [2];
  remote.stars = { 1: 3 };
  remote.coins = 50;
  const merged = mergeStates(local, remote);
  assert.deepEqual(merged.completed, [1, 2]);
  assert.equal(merged.stars[1], 3);
  assert.equal(merged.coins, 200);
});

test("migrates a legacy currentLevel into completed campaign IDs", () => {
  const migrated = migrateLegacy({
    game_progress: { currentLevel: 3, stars: { 0: 2 } },
    game_economy: { coins: 77 },
    game_companions: { hearts: 4, unlocked: ["owl"], activeId: "owl" }
  });
  assert.deepEqual(migrated.completed, [1, 2]);
  assert.equal(migrated.lastLevel, 3);
  assert.equal(migrated.coins, 77);
  assert.equal(migrated.hearts, 4);
  assert.equal(migrated.stars[1], 2);
});

test("spend is atomic for invalid and insufficient amounts", () => {
  const store = new SaveStore(new MemoryStorage());
  const before = store.state.coins;
  assert.equal(store.spend(0), false);
  assert.equal(store.spend(before + 1), false);
  assert.equal(store.state.coins, before);
  assert.equal(store.spend(20), true);
  assert.equal(store.state.coins, before - 20);
});