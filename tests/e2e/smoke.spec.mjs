import { expect, test } from "@playwright/test";

async function solveLevel(page) {
  const words = await page.evaluate(async () => (await (await fetch("./levels.json")).json())[0].words.map((entry) => entry.word));
  const letterIndexes = await page.locator(".letter").evaluateAll((buttons) => Object.fromEntries(buttons.map((button) => [button.textContent.trim(), button.dataset.letter])));
  for (const word of words) {
    for (const letter of word) {
      const index = letterIndexes[letter];
      if (index === undefined) throw new Error("Missing letter button for " + letter);
      await page.locator(".letter[data-letter='" + index + "']").click();
    }
    await page.locator("#word-preview").click();
  }
}

test("boots fallback and completes the first level", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await expect(page.locator(".tutorial-guide")).toBeVisible();
  await solveLevel(page);
  await expect(page.locator(".result-modal")).toBeVisible();
  await expect(page.locator(".result-modal")).toContainText("Уровень пройден");
  await page.screenshot({ path: "test-results/first-level-victory.png", fullPage: true });
  await page.locator(".result-footer [data-action='home']").click();
  await expect(page.locator(".home")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("persists campaign progress across a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await solveLevel(page);
  await expect(page.locator(".result-modal")).toBeVisible();
  await page.locator(".result-footer [data-action='home']").click();
  await expect(page.locator(".home")).toBeVisible();
  await expect(page.locator(".journey-card")).toContainText("Уровень 2 из 304");

  await page.reload();
  await expect(page.locator(".home")).toBeVisible();
  await expect(page.locator(".journey-card")).toContainText("Уровень 2 из 304");
});
test("does not duplicate rewards when replaying a completed level", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await solveLevel(page);
  await expect(page.locator(".result-modal")).toBeVisible();
  await page.locator(".result-footer [data-action='home']").click();
  await expect(page.locator(".home")).toBeVisible();

  const firstCompletion = await page.evaluate(() => JSON.parse(localStorage.getItem("expedition_rebus_v5")));
  await page.locator("[data-action='map']").first().click();
  await expect(page.locator(".map-screen")).toBeVisible();
  await page.locator(".map-screen [data-action='level'][data-id='1']").click();
  await expect(page.locator(".game")).toBeVisible();
  await solveLevel(page);
  await expect(page.locator(".result-modal")).toBeVisible();

  const replayState = await page.evaluate(() => JSON.parse(localStorage.getItem("expedition_rebus_v5")));
  expect(replayState.coins).toBe(firstCompletion.coins);
  expect(replayState.completed).toEqual(firstCompletion.completed);
});
 test("keeps the game usable at the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    boardVisible: Boolean(document.querySelector(".board")?.getBoundingClientRect().width)
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  expect(dimensions.boardVisible).toBe(true);
});
test("opens the primary fallback surfaces", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await page.locator("[data-action='home']").first().click();
  await expect(page.locator(".home")).toBeVisible();

  const routes = [
    ["map", ".map-screen"],
    ["album", ".album-screen"],
    ["pets", ".pets-screen"],
    ["goals", ".modal"],
    ["weekly", ".modal"],
    ["shop", ".modal"],
    ["settings", ".modal"]
  ];

  for (const [action, selector] of routes) {
    await page.locator("[data-action='" + action + "']").first().click();
    await expect(page.locator(selector)).toBeVisible();
    if (selector === ".modal") {
      await page.keyboard.press("Escape");
    } else {
      await page.locator("[data-action='home']").first().click();
    }
    await expect(page.locator(".home")).toBeVisible();
  }
});
