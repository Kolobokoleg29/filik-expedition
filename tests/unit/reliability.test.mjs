import assert from "node:assert/strict";
import test from "node:test";
import { CommerceService } from "../../src/commerce.js";
import { YandexPlatform } from "../../src/platform.js";
import { freshState } from "../../src/storage.js";
import { normalizeConfig } from "../../src/config.js";

function makeStore() {
  return { state: freshState(), onChange: () => {} };
}

function makeHost() {
  return { location: { hostname: "localhost", protocol: "http:", search: "" } };
}

function makeAnalytics() {
  return { send() {} };
}

test("releases the ad boundary after an error before the ad opens", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost(), { adOpenTimeout: 50 });
  platform.lastAd = 0;
  platform.sdk = {
    adv: {
      showFullscreenAdv({ callbacks }) {
        callbacks.onError(new Error("offline"));
      }
    }
  };

  assert.equal(await platform.interstitial(), false);
  assert.equal(platform.adBusy, false);
  assert.equal(platform.paused, false);
  assert.equal(platform.lastAd, 0);
});

test("keeps the cooldown after an opened ad session fails", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost(), { adOpenTimeout: 50 });
  platform.lastAd = 0;
  platform.sdk = {
    adv: {
      showRewardedVideo({ callbacks }) {
        callbacks.onOpen();
        callbacks.onError(new Error("closed"));
      }
    }
  };

  assert.equal(await platform.rewarded(), false);
  assert.equal(platform.adBusy, false);
  assert.equal(platform.paused, false);
  assert.ok(platform.lastAd > 0);
});

test("keeps cloud writes retryable after a transient setData failure", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost());
  let writes = 0;
  platform.sdk = {
    async getPlayer() {
      return {
        async getData() {
          return {};
        },
        async setData() {
          writes++;
          if (writes === 1) throw new Error("temporary cloud failure");
        }
      };
    }
  };

  assert.equal(await platform.loadCloud(), false);
  assert.equal(platform.cloudReady, true);
  assert.equal(platform.dirty, true);
  assert.equal(await platform.flush(true), true);
  assert.equal(platform.dirty, false);
  assert.equal(writes, 2);
  clearTimeout(platform.timer);
  platform.timer = null;
});

test("does not grant a pending coin receipt twice before consume recovers", async () => {
  const state = freshState();
  let consumes = 0;
  const service = new CommerceService({
    platform: {
      cloudReady: true,
      async flush() {
        return true;
      },
      async consume() {
        consumes++;
        return consumes > 1;
      },
      async catalog() {
        return [];
      }
    },
    store: { state },
    analytics: makeAnalytics(),
    getConfig: () => normalizeConfig(),
    save() {}
  });

  const first = await service.applyPurchase({ id: "expedition_coins_500", purchaseToken: "pending-1" });
  const balance = state.coins;
  const second = await service.applyPurchase({ id: "expedition_coins_500", purchaseToken: "pending-1" });

  assert.equal(first.ok, true);
  assert.equal(first.changed, true);
  assert.equal(second.ok, true);
  assert.equal(second.changed, false);
  assert.equal(state.coins, balance);
  assert.equal(state.purchaseLedger["pending-1"].status, "consumed");
  assert.equal(consumes, 2);
});

test("times out an ad that never opens without leaving gameplay paused", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost(), { adOpenTimeout: 10 });
  platform.sdk = {
    adv: {
      showRewardedVideo() {}
    }
  };

  assert.equal(await platform.rewarded(), false);
  assert.equal(platform.adBusy, false);
  assert.equal(platform.paused, false);
});

test("clears account-bound caches when refreshing the cloud player", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost());
  const previousPlayer = { id: "previous" };
  const nextPlayer = { async getData() { return null; } };
  platform.player = previousPlayer;
  platform.paymentsApi = { id: "previous-payments" };
  platform.cloudReady = true;
  platform.sdk = { async getPlayer() { return nextPlayer; } };

  assert.equal(await platform.loadCloud({ refreshPlayer: true }), true);
  assert.equal(platform.player, nextPlayer);
  assert.equal(platform.paymentsApi, null);
  assert.equal(platform.cloudReady, true);
});

test("fails closed when refreshing the cloud player fails", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost());
  platform.player = { id: "previous" };
  platform.paymentsApi = { id: "previous-payments" };
  platform.cloudReady = true;
  platform.sdk = { async getPlayer() { throw new Error("account unavailable"); } };

  assert.equal(await platform.loadCloud({ refreshPlayer: true }), false);
  assert.equal(platform.player, null);
  assert.equal(platform.paymentsApi, null);
  assert.equal(platform.cloudReady, false);
});
