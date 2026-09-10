import { expect, test } from "@playwright/test";

test("keeps daily route and profile portraits asset-backed and readable", async ({ page }) => {
  await page.setViewportSize({ width: 865, height: 800 });
  await page.goto("/");
  if (await page.locator(".game").count()) await page.locator("[data-action=home]").first().click();

  await page.locator("[data-action=daily]").first().click();
  await expect(page.locator('[data-modal-type="daily"]')).toBeVisible();
  await expect(page.locator(".route-step-icon")).toHaveCount(3);
  expect(await page.locator(".route-step-icon").evaluateAll((images) => images.every((image) => image.tagName === "IMG"))).toBe(true);
  await page.keyboard.press("Escape");

  await page.locator("[data-action=profile]").first().click();
  await expect(page.locator('[data-modal-type="profile"]')).toBeVisible();
  const portraitGroup = page.locator('[data-profile-group="portrait"]');
  await expect(portraitGroup).toHaveCount(1);
  await expect(portraitGroup.locator(".profile-custom-option")).toHaveCount(4);
  const metrics = await portraitGroup.locator(".profile-custom-option").evaluateAll((options) => options.map((option) => {
    const image = option.querySelector("img");
    const optionRect = option.getBoundingClientRect();
    const imageRect = image?.getBoundingClientRect();
    return { optionWidth: optionRect.width, optionHeight: optionRect.height, imageWidth: imageRect?.width || 0, imageHeight: imageRect?.height || 0 };
  }));
  expect(metrics.every((item) => item.optionWidth > 100 && item.optionHeight > 140 && item.imageWidth > 80 && item.imageHeight > 80)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(865);
  await page.screenshot({ path: "artifacts/qa-visual-profile.png", fullPage: true });
});

test("keeps the portrait customizer within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  if (await page.locator(".game").count()) await page.locator("[data-action=home]").first().click();
  await page.locator("[data-action=profile]").first().click();
  const portraitGroup = page.locator('[data-profile-group="portrait"]');
  await expect(portraitGroup).toBeVisible();
  const metrics = await portraitGroup.locator(".profile-custom-option").evaluateAll((options) => options.map((option) => {
    const image = option.querySelector("img");
    const rect = image?.getBoundingClientRect();
    return { width: rect?.width || 0, height: rect?.height || 0 };
  }));
  expect(metrics.every((item) => item.width > 70 && item.height > 70)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});