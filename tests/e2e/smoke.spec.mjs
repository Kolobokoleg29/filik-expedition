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