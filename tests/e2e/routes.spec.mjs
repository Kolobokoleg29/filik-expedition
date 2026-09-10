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

test("keeps the weekly CTA reachable on short mobile screens", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await page.locator("[data-action=home]").first().click();
  await expect(page.locator(".home")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const home = document.querySelector(".home");
    const weekly = document.querySelector(".weekly-fab");
    if (!home || !weekly) return null;
    home.scrollTop = home.scrollHeight;
    const rect = weekly.getBoundingClientRect();
    return {
      scrollHeight: home.scrollHeight,
      clientHeight: home.clientHeight,
      weeklyTop: rect.top,
      weeklyBottom: rect.bottom
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(metrics.weeklyTop).toBeGreaterThanOrEqual(0);
  expect(metrics.weeklyBottom).toBeLessThanOrEqual(667);
});

test("surfaces the current story from camp", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await page.locator("[data-action=home]").first().click();
  await expect(page.locator(".home")).toBeVisible();
  await expect(page.locator(".story-teaser")).toContainText("Запись из дневника");
  await page.locator(".story-teaser [data-action=story]").click();
  await expect(page.locator(".story-modal-hero")).toBeVisible()
  await expect(page.locator("#modal-root .modal")).toHaveAttribute("data-modal-type", "story");
  await expect(page.locator(".story-copy")).toContainText("На чердаке");
  await page.keyboard.press("Escape");
  await expect(page.locator(".home")).toBeVisible();
});

test("introduces a new chapter without requiring a companion", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("expedition_rebus_v5", JSON.stringify({
      version: 5,
      onboardingSeen: true,
      completed: Array.from({ length: 8 }, (_, index) => index + 1),
      lastLevel: 8,
      pets: [],
      activePet: null
    }));
  });
  await page.goto("/");
  await expect(page.locator(".home")).toBeVisible();
  await page.locator("[data-action=continue]").click();
  await expect(page.locator(".chapter-intro-modal")).toBeVisible();
  await expect(page.locator(".chapter-intro-modal")).toContainText("Горный Перевал");
  await expect(page.locator(".chapter-story-copy")).toContainText("перевале");
  await expect(page.locator(".chapter-intro-modal .companion-presence")).toHaveCount(0);
});
