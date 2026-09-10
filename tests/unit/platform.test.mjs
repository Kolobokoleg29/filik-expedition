import assert from "node:assert/strict";
import test from "node:test";
import { YandexPlatform } from "../../src/platform.js";
import { freshState } from "../../src/storage.js";

function makeStore() {
  return { state: freshState(), onChange: () => {} };
}

function makeHost(search = "") {
  return { location: { hostname: "localhost", protocol: "http:", search } };
}

test("keeps gameplay paused until all platform reasons are released", () => {
  const platform = new YandexPlatform(makeStore(), makeHost());
  const calls = [];
  platform.sdk = { features: { GameplayAPI: { start: () => calls.push("start"), stop: () => calls.push("stop") } } };
  platform.setGameplay(true);
  platform.pause("modal", true);
  platform.pause("hidden", true);
  platform.pause("modal", false);
  assert.deepEqual(calls, ["start", "stop"]);
  platform.pause("hidden", false);
  assert.deepEqual(calls, ["start", "stop", "start"]);
  platform.setGameplay(false);
  assert.deepEqual(calls, ["start", "stop", "start", "stop"]);
});

test("clamps remote ad cooldown to safe bounds", () => {
  const platform = new YandexPlatform(makeStore(), makeHost());
  platform.configure({ ads: { interstitialCooldownMs: 1 } });
  assert.equal(platform.adCooldownMs, 60000);
  platform.configure({ ads: { interstitialCooldownMs: 99999999 } });
  assert.equal(platform.adCooldownMs, 900000);
});

test("loads an empty cloud profile without blocking fallback play", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost());
  platform.sdk = { async getPlayer() { return { async getData() { return null; }, async setData() {} }; } };
  assert.equal(await platform.loadCloud(), true);
  assert.equal(platform.cloudReady, true);
  assert.equal(platform.lastStatus.state, "empty");
});

test("submits a bounded leaderboard score through the available SDK method", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost());
  const calls = [];
  platform.sdk = {
    async isAvailableMethod() { return true; },
    leaderboards: {
      async setScore(board, score, extra) { calls.push([board, score, extra]); }
    }
  };
  assert.equal(await platform.leaderboardSubmit("expeditionEndless", 12.9, "best:12"), true);
  assert.deepEqual(calls, [["expeditionEndless", 12, "best:12"]]);
});

test("resolves rewarded ads only after the SDK callback reports a reward", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost(), { adOpenTimeout: 100, adSessionTimeout: 100 });
  platform.sdk = {
    adv: {
      showRewardedVideo({ callbacks }) {
        callbacks.onOpen();
        callbacks.onRewarded();
        callbacks.onClose(true);
      }
    }
  };
  assert.equal(await platform.rewarded(), true);
  assert.equal(platform.adBusy, false);
  assert.equal(platform.paused, false);
});