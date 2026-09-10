import assert from "node:assert/strict";
import test from "node:test";
import { CommerceService, purchaseProductId } from "../../src/commerce.js";
import { freshState } from "../../src/storage.js";
import { normalizeConfig } from "../../src/config.js";

test("normalizes product IDs across Yandex purchase shapes", () => {
  assert.equal(purchaseProductId({ productID: "a" }), "a");
  assert.equal(purchaseProductId({ id: "b" }), "b");
  assert.equal(purchaseProductId(null), "");
});

test("grants a coin receipt once and consumes it after cloud save", async () => {
  const state = freshState();
  const events = [];
  const service = new CommerceService({
    platform: {
      cloudReady: true,
      async flush() { events.push("flush"); return true; },
      async consume(token) { events.push("consume:" + token); return true; },
      async catalog() { return []; }
    },
    store: { state },
    analytics: { send(name) { events.push(name); } },
    getConfig: () => normalizeConfig(),
    save() {}
  });
  const purchase = { id: "expedition_coins_500", purchaseToken: "receipt-1" };
  const first = await service.applyPurchase(purchase);
  const balance = state.coins;
  const second = await service.applyPurchase(purchase);
  assert.equal(first.ok, true);
  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(state.coins, balance);
  assert.equal(state.purchaseLedger["receipt-1"].status, "consumed");
  assert.equal(events.includes("consume:receipt-1"), true);
});

test("rejects a receipt token reused for another product", async () => {
  const state = freshState();
  state.purchaseLedger["receipt-1"] = { productId: "expedition_coins_500", amount: 500, status: "pending", updatedAt: 0 };
  state.processedPurchases.push("receipt-1");
  state.purchaseGrants["receipt-1"] = 500;
  const service = new CommerceService({
    platform: { cloudReady: true, async flush() { return true; }, async consume() { return true; } },
    store: { state },
    analytics: { send() {} },
    getConfig: () => normalizeConfig(),
    save() {}
  });
  const result = await service.applyPurchase({ id: "expedition_coins_1200", purchaseToken: "receipt-1" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "receipt-product-mismatch");
  assert.equal(state.coins, 120);
});

test("starter bundle grants the rare wolf companion", async () => {
  const state = freshState();
  const service = new CommerceService({
    platform: { cloudReady: true, async flush() { return true; }, async consume() { return true; } },
    store: { state },
    analytics: { send() {} },
    getConfig: () => normalizeConfig(),
    save() {}
  });
  const result = await service.applyPurchase({ id: "expedition_starter", purchaseToken: "starter-1" });
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(state.pets.includes("wolf"), true);
  assert.equal(state.pets.includes("owl"), false);
  assert.equal(state.activePet, "wolf");
  assert.equal(state.petLevels.wolf, 1);
});
