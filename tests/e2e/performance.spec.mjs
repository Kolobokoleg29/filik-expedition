import { expect, test } from "@playwright/test";

test("loads exactly one responsive camp background without duplicate asset paths", async ({ page }) => {
  const imageRequests = [];
  const failedRequests = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image" || request.url().includes("/assets/assets/")) {
      imageRequests.push(new URL(request.url()).pathname);
    }
  });
  page.on("requestfailed", (request) => failedRequests.push(request.url()));

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/?performance-audit=" + viewport.width, { waitUntil: "networkidle" });
    await expect(page.locator(".game")).toBeVisible();

    const metrics = await page.evaluate(() => ({
      background: getComputedStyle(document.querySelector("#landscape")).backgroundImage,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    }));

    expect(metrics.background).toContain("/assets/UI/");
    expect(metrics.background).not.toBe("none");
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(imageRequests.filter((path) => path.includes("/assets/assets/"))).toEqual([]);
    expect(failedRequests).toEqual([]);
  }

  const campBackgrounds = imageRequests.filter((path) => path.includes("/assets/UI/") && path.includes("camp_intro"));
  expect(new Set(campBackgrounds).size).toBe(2);
});
