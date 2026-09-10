import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("expedition_rebus_v5", JSON.stringify({
      version: 5,
      onboardingSeen: true,
      completed: [],
      lastLevel: 1,
      coins: 0,
      pets: [],
      activePet: null
    }));
  });
});

test("loads the official mock catalog and completes a purchase", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));

  expect((await page.request.get("/sdk.js")).status()).toBe(200);
  expect((await page.request.get("/purchases-catalog.json")).status()).toBe(200);
  await page.goto("/");
  await expect(page.locator(".home")).toBeVisible();
  await page.locator("[data-action=shop]").first().click();
  await expect(page.locator("[data-action=purchase-coins]")).toHaveCount(5);
  await expect(page.locator(".real-offer")).toHaveCount(2);

  await page.locator("[data-action=purchase-coins]").first().click();
  await expect(page.getByText("Purchase", { exact: true })).toBeVisible();
  await page.getByText("Purchase", { exact: true }).click();
  await expect(page.locator(".shop-wallet")).toContainText("500");
  expect(errors).toEqual([]);
});

test("keeps a cancelled purchase and rewarded callback safe", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.locator(".home")).toBeVisible();
  await page.locator("[data-action=shop]").first().click();
  const purchase = page.locator("[data-action=purchase-coins]").first();
  await purchase.click();
  await expect(page.getByText("Purchase", { exact: true })).toBeVisible();
  await page.getByText("Cancel", { exact: true }).click();
  await expect(page.locator(".shop-wallet")).toContainText("0");
  await expect(purchase).not.toHaveClass(/is-pending/);

  await page.keyboard.press("Escape");
  await expect(page.locator(".home")).toBeVisible();
  await page.locator("[data-action=wallet]").first().click();
  await page.locator("[data-action=ad-coins]").click();
  await expect(page.locator("#ADV_BANNER")).toBeVisible();
  await expect.poll(() => page.locator("#ADV_BANNER .webgames-adv-timer").count(), { timeout: 7000 }).toBe(0);
  await page.evaluate(() => document.querySelector("#ADV_BANNER img.webgames-adv-cross")?.click());
  await expect(page.locator("#modal-root .modal")).toContainText("30 монет", { timeout: 5000 });
  expect(errors).toEqual([]);
});
