import { expect, test } from "@playwright/test";

test("exposes labelled game controls without mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();

  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    wheelRole: document.querySelector("#wheel")?.getAttribute("role"),
    wheelLabel: document.querySelector("#wheel")?.getAttribute("aria-label"),
    gameTipRole: document.querySelector("#game-tip")?.getAttribute("role"),
    gameTipLive: document.querySelector("#game-tip")?.getAttribute("aria-live"),
    pauseRole: document.querySelector("#pause-shield")?.getAttribute("role")
  }));

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.wheelRole).toBe("group");
  expect(metrics.wheelLabel).toBe("Буквы для составления слов");
  expect(metrics.gameTipRole).toBe("status");
  expect(metrics.gameTipLive).toBe("polite");
  expect(metrics.pauseRole).toBe("status");
});

test("wraps goals categories inside the mobile modal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await page.locator("[data-action=home]").first().click();
  await expect(page.locator(".home")).toBeVisible();
  await page.locator("[data-action=goals]").first().click();
  await expect(page.locator(".goal-category-tabs")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const tabs = document.querySelector(".goal-category-tabs");
    const bounds = tabs?.getBoundingClientRect();
    const overflowing = Array.from(tabs?.querySelectorAll("button") || []).filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.left < (bounds?.left || 0) - 1 || rect.right > (bounds?.right || 0) + 1;
    });
    return {
      clientWidth: tabs?.clientWidth || 0,
      scrollWidth: tabs?.scrollWidth || 0,
      overflowing: overflowing.length
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.overflowing).toBe(0);
});

test("keeps modal semantics and focus contained", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  await page.locator("[data-action='home']").first().click();
  await expect(page.locator(".home")).toBeVisible();

  const settings = page.locator("[data-action='settings']").first();
  await settings.click();
  const dialog = page.locator("[role='dialog']");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  const labelledBy = await dialog.getAttribute("aria-labelledby");
  expect(labelledBy).toBeTruthy();
  await expect(page.locator("#" + labelledBy)).toHaveCount(1);
  const describedBy = await dialog.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(page.locator("#" + describedBy)).toHaveCount(1);
  expect(await page.evaluate(() => document.activeElement?.closest("[role='dialog']") !== null)).toBe(true);

  const enabledButtons = dialog.locator("button:not(:disabled)");
  await enabledButtons.last().focus();
  await page.keyboard.press("Tab");
  await expect(enabledButtons.first()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.locator(".home")).toBeVisible();
  await expect(settings).toBeFocused();
});

test("updates the live game status through keyboard input", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game")).toBeVisible();
  const word = await page.evaluate(async () => (await (await fetch("./levels.json")).json())[0].words[0].word);

  const keyCodes = {
    Й: "KeyQ", Ц: "KeyW", У: "KeyE", К: "KeyR", Е: "KeyT", Н: "KeyY", Г: "KeyU", Ш: "KeyI",
    Щ: "KeyO", З: "KeyP", Х: "BracketLeft", Ъ: "BracketRight", Ф: "KeyA", Ы: "KeyS", В: "KeyD",
    А: "KeyF", П: "KeyG", Р: "KeyH", О: "KeyJ", Л: "KeyK", Д: "KeyL", Ж: "Semicolon",
    Э: "Quote", Я: "KeyZ", Ч: "KeyX", С: "KeyC", М: "KeyV", И: "KeyB", Т: "KeyN", Ь: "KeyM",
    Б: "Comma", Ю: "Period"
  };
  for (const letter of word) await page.keyboard.press(keyCodes[letter]);
  await expect(page.locator("#word-preview")).toHaveAttribute("aria-label", "Отправить слово " + word);
  await page.keyboard.press("Enter");
  await expect(page.locator(".board")).toHaveAttribute("aria-label", /найдено 1/);
  await expect(page.locator("#game-tip")).toHaveAttribute("role", "status");
});
