import { expect, test } from "@playwright/test";

test("starts the daily route from home and returns to camp", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await page.locator("[data-action=home]").first().click();
  await expect(page.locator(".home")).toBeVisible();

  await page.locator("[data-action=daily]").first().click();
  await expect(page.locator("[data-action=daily-start]")).toBeVisible();
  await page.locator("[data-action=daily-start]").click();
  await expect(page.locator(".game-heading")).toContainText("Маршрут дня");

  await page.locator("[data-action=home]").first().click();
  await expect(page.locator(".home")).toBeVisible();
});

test("restores the weekly modal before closing the nested leaderboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await page.locator("[data-action=home]").first().click();
  await page.locator("[data-action=weekly]").first().click();
  await expect(page.locator("[data-action=leaderboard]")).toBeVisible();

  await page.locator("[data-action=leaderboard]").click();
  await expect(page.locator(".modal")).toContainText("Таблица пока недоступна");

  await page.keyboard.press("Escape");
  await expect(page.locator(".modal")).toContainText("Экспедиция недели");
  await page.keyboard.press("Escape");
  await expect(page.locator(".home")).toBeVisible();
});
