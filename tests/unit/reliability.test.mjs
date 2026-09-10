import assert from "node:assert/strict";
import test from "node:test";
import { CommerceService } from "../../src/commerce.js";
import { YandexPlatform } from "../../src/platform.js";
import { freshState, SAVE_KEY, SaveStore } from "../../src/storage.js";
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

class MemoryStorage {
  constructor() { this.entries = new Map(); }
  getItem(key) { return this.entries.get(key) ?? null; }
  setItem(key, value) { this.entries.set(key, String(value)); }
  removeItem(key) { this.entries.delete(key); }
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

test("invalidates account caches on SDK account close", async () => {
  const platform = new YandexPlatform(makeStore(), makeHost());
  const handlers = new Map();
  platform.sdk = {
    EVENTS: { ACCOUNT_SELECTION_DIALOG_OPENED: "opened", ACCOUNT_SELECTION_DIALOG_CLOSED: "closed" },
    on(event, handler) { handlers.set(event, handler); }
  };
  platform.player = { id: "old-player" };
  platform.paymentsApi = { id: "old-payments" };
  platform.cloudReady = true;

  platform.bindAccountSelectionEvents();
  handlers.get("opened")();
  assert.equal(platform.accountSelectionOpen, true);
  assert.equal(platform.paused, true);
  handlers.get("closed")();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(platform.accountSelectionOpen, false);
  assert.equal(platform.player, null);
  assert.equal(platform.paymentsApi, null);
  assert.equal(platform.cloudReady, false);
  assert.equal(platform.paused, false);
});


test("serializes purchase and restore operations", async () => {
  const state = freshState();
  let resolvePurchase;
  let resolveRestore;
  let purchaseCalls = 0;
  const service = new CommerceService({
    platform: {
      cloudReady: true,
      async purchase() {
        purchaseCalls++;
        return new Promise(resolve => { resolvePurchase = resolve; });
      },
      async restorePurchases() {
        return new Promise(resolve => { resolveRestore = resolve; });
      },
      async flush() { return true; },
      async consume() { return true; }
    },
    store: { state },
    analytics: makeAnalytics(),
    getConfig: () => normalizeConfig(),
    save() {}
  });

  const purchasePromise = service.buy("expedition_coins_500");
  await Promise.resolve();
  assert.equal(service.busy, "purchase");
  assert.equal((await service.buy("expedition_coins_1200")).reason, "busy");
  assert.equal((await service.recover()).reason, "busy");

  resolvePurchase({ id: "expedition_coins_500", purchaseToken: "serial-1" });
  const purchase = await purchasePromise;
  assert.equal(purchase.ok, true);
  assert.equal(purchaseCalls, 1);
  assert.equal(service.busy, null);

  const restorePromise = service.recover();
  await Promise.resolve();
  assert.equal(service.busy, "restore");
  assert.equal((await service.buy("expedition_coins_500")).reason, "busy");
  resolveRestore([]);
  assert.deepEqual(await restorePromise, { ok: true, restored: 0 });
  assert.equal(service.busy, null);
});

test("does not merge the previous account into a switched cloud profile", async () => {
  const store = new SaveStore(new MemoryStorage());
  store.state.completed = [1];
  store.state.coins = 999;
  store.save();
  store.setAccountId("account-a");

  const remote = freshState();
  remote.completed = [2];
  remote.coins = 77;
  const platform = new YandexPlatform(store, makeHost());
  let writes = 0;
  platform.sdk = {
    async getPlayer() {
      return {
        getUniqueID() { return "account-b"; },
        async getData() { return { [SAVE_KEY]: remote }; },
        async setData() { writes++; }
      };
    }
  };

  assert.equal(await platform.loadCloud({ refreshPlayer: true }), true);
  assert.deepEqual(store.state.completed, [2]);
  assert.equal(store.state.coins, 77);
  assert.equal(store.accountId, "account-b");
  assert.equal(writes, 0);
});


test("resets to a fresh profile when a switched cloud account is empty", async () => {
  const store = new SaveStore(new MemoryStorage());
  store.state.completed = [1, 2];
  store.state.coins = 999;
  store.save();
  store.setAccountId("account-a");

  let writes = 0;
  const platform = new YandexPlatform(store, makeHost());
  platform.sdk = {
    async getPlayer() {
      return {
        getUniqueID() { return "account-b"; },
        async getData() { return null; },
        async setData(payload) {
          writes++;
          assert.equal(payload[SAVE_KEY].completed.length, 0);
          assert.equal(payload[SAVE_KEY].coins, 120);
        }
      };
    }
  };

  assert.equal(await platform.loadCloud({ refreshPlayer: true }), true);
  assert.deepEqual(store.state.completed, []);
  assert.equal(store.state.coins, 120);
  assert.equal(store.accountId, "account-b");
  assert.equal(writes, 1);
});

test("does not expose the previous profile when switched cloud loading fails", async () => {
  const store = new SaveStore(new MemoryStorage());
  store.state.completed = [1];
  store.save();
  store.setAccountId("account-a");

  const platform = new YandexPlatform(store, makeHost());
  platform.sdk = {
    async getPlayer() {
      return {
        getUniqueID() { return "account-b"; },
        async getData() { throw new Error("offline"); }
      };
    }
  };

  assert.equal(await platform.loadCloud({ refreshPlayer: true }), false);
  assert.deepEqual(store.state.completed, []);
  assert.equal(store.state.coins, 120);
  assert.equal(store.accountId, "account-b");
  assert.equal(platform.cloudReady, false);
});
