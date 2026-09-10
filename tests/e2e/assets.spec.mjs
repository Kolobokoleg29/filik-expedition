import { expect, test } from "@playwright/test";

const screens = [
  ["map", ".map-screen", 76],
  ["album", ".album-screen", 38],
  ["pets", ".pets-screen", 12]
];

test("loads all lazy screen assets on desktop and mobile", async ({ page }) => {
  const failed = [];
  page.on("requestfailed", (request) => failed.push(request.url()));

  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/?asset-regression=" + viewport.width);
    await expect(page.locator(".game, .home").first()).toBeVisible();
    if (await page.locator(".game").isVisible()) await page.locator("[data-action=home]").first().click();
    await expect(page.locator(".home")).toBeVisible();

    for (const [action, selector, minimum] of screens) {
      await page.locator("[data-action=" + action + "]").first().click();
      const screen = page.locator(selector);
      await expect(screen).toBeVisible();
      if (action === "map") await expect(screen.locator(".map-route-compass")).toHaveJSProperty("naturalWidth", 384);
      await screen.evaluate((element) => element.scrollTo(0, element.scrollHeight));
      await expect.poll(
        () => screen.locator("img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
        { timeout: 5000 }
      ).toBe(true);
      expect(await screen.locator("img").count()).toBeGreaterThanOrEqual(minimum);
      await page.locator("[data-action=home]").first().click();
      await expect(page.locator(".home")).toBeVisible();
    }
  }

  expect(failed).toEqual([]);
});
