import { expect, test } from "@playwright/test";

test("keeps the Yandex loading and gameplay lifecycle in sync with visible play", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("expedition_rebus_v5", JSON.stringify({
      version: 5,
      onboardingSeen: true,
      completed: [],
      lastLevel: 1,
      pets: [],
      activePet: null
    }));
    window.__sdkCalls = [];
    window.YaGames = {
      init: async () => {
        const calls = window.__sdkCalls;
        const player = {
          getUniqueID: () => "sdk-lifecycle-qa",
          getData: async () => ({}),
          setData: async () => undefined
        };
        return {
          getPlayer: async () => player,
          getFlags: async ({ defaultFlags }) => defaultFlags,
          features: {
            LoadingAPI: { ready: () => calls.push("loading-ready") },
            GameplayAPI: {
              start: () => calls.push("gameplay-start"),
              stop: () => calls.push("gameplay-stop")
            }
          },
          on() {}
        };
      }
    };
  });

  await page.goto("/");
  await expect(page.locator(".home")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__sdkCalls)).toContain("loading-ready");
  expect(await page.evaluate(() => window.__sdkCalls.filter((call) => call === "loading-ready").length)).toBe(1);

  await page.locator("[data-action=continue]").first().click();
  await expect(page.locator(".game")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__sdkCalls)).toContain("gameplay-start");

  await page.locator(".game [data-action=help]").click();
  await expect(page.locator("#modal-root .modal")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__sdkCalls)).toContain("gameplay-stop");

  await page.keyboard.press("Escape");
  await expect(page.locator(".game [data-action=help]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__sdkCalls.filter((call) => call === "gameplay-start").length)).toBe(2);

  expect(await page.evaluate(() => window.__sdkCalls)).toEqual([
    "loading-ready",
    "gameplay-start",
    "gameplay-stop",
    "gameplay-start"
  ]);
});
