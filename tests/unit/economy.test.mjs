import assert from "node:assert/strict";
import test from "node:test";
import { buyShopItem, claimGoal, dailyGiftOffer, ensureDailyState, ensureWeeklyState, GOALS } from "../../src/economy.js";
import { freshState } from "../../src/storage.js";

function storeWithState(state) {
  return {
    state,
    spend(amount) {
      if (!Number.isInteger(amount) || amount <= 0 || this.state.coins < amount) return false;
      this.state.coins -= amount;
      return true;
    }
  };
}

test("buys repeatable and permanent shop items safely", () => {
  const state = freshState();
  state.coins = 1000;
  const store = storeWithState(state);
  const permanent = buyShopItem(store, "portrait-owl");
  assert.equal(permanent.ok, true);
  assert.equal(state.inventory.includes("portrait-owl"), true);
  assert.equal(buyShopItem(store, "portrait-owl").reason, "owned");
  const repeatable = buyShopItem(store, "hint-supply");
  assert.equal(repeatable.ok, true);
  assert.equal(state.freeHints, 3);
});

test("rejects unknown and unaffordable purchases without mutation", () => {
  const state = freshState();
  const store = storeWithState(state);
  const before = state.coins;
  assert.equal(buyShopItem(store, "missing").reason, "unknown");
  assert.equal(buyShopItem(store, "captain-north").reason, "funds");
  assert.equal(state.coins, before);
});

test("claims a ready goal once and grants its paired heart reward", () => {
  const state = freshState();
  state.completed = [1];
  state.coins = 0;
  const first = claimGoal(state, "first", () => 0);
  assert.equal(first.ok, true);
  assert.equal(first.coins, 20);
  assert.equal(first.hearts, 2);
  assert.equal(state.goals.includes("first"), true);
  assert.equal(claimGoal(state, "first", () => 0).reason, "claimed");
  assert.equal(state.coins, 20);
});

test("keeps daily and weekly reset boundaries explicit", () => {
  const state = freshState();
  assert.equal(ensureDailyState(state, "2026-09-10"), true);
  assert.equal(ensureDailyState(state, "2026-09-10"), false);
  assert.equal(ensureWeeklyState(state, "2026-09-07"), true);
  assert.equal(ensureWeeklyState(state, "2026-09-07"), false);
  assert.equal(GOALS.length > 0, true);
});

test("calculates the daily gift streak and cap", () => {
  const state = freshState();
  state.gift = { day: "2026-09-09", streak: 4 };
  const offer = dailyGiftOffer(state, "2026-09-10", "2026-09-09");
  assert.deepEqual(offer, { claimed: false, streak: 5, reward: 45 });
});