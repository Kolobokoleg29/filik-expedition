import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CONFIG, applyRemoteFlags, configDefaultFlags, normalizeConfig } from "../../src/config.js";

test("normalizes missing and out-of-range config values", () => {
  const config = normalizeConfig({ weekly: { steps: 999 }, rewarded: { coins: -10 }, commerceEnabled: "false" });
  assert.equal(config.weekly.steps, 20);
  assert.equal(config.rewarded.coins, 1);
  assert.equal(config.commerceEnabled, false);
});

test("serializes safe defaults into remote flag values", () => {
  const flags = configDefaultFlags(DEFAULT_CONFIG);
  assert.equal(flags.weekly_steps, "7");
  assert.equal(flags.commerce_enabled, "true");
  assert.equal(flags.companion_upgrade_costs, "10,20,30,50");
});

test("applies remote flags through the same normalization boundary", () => {
  const config = applyRemoteFlags(DEFAULT_CONFIG, {
    weekly_steps: "12",
    rewarded_coin_daily_cap: "999",
    commerce_enabled: "false"
  });
  assert.equal(config.weekly.steps, 12);
  assert.equal(config.rewarded.coinDailyCap, 10);
  assert.equal(config.commerceEnabled, false);
});