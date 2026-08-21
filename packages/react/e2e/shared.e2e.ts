import { expect, test } from "@playwright/test";

test("the cross-platform steps file drives a real browser tour end to end", async ({ page }) => {
  await page.goto("/?plan=pro");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("#launch-shared");

  await expect(page.locator('[data-tourkit="card"]')).toContainText("Post a ride");
  expect(await page.locator("#route").textContent()).toBe("/");

  await page.locator('[data-tourkit="hole-catcher"]').click();

  await expect(page.locator('[data-tourkit="card"]')).toContainText("Your messages");
  expect(await page.locator("#route").textContent()).toBe("/inbox");

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Payouts");

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Past rides");
  await page.waitForTimeout(600);

  const scroller = await page.locator("#history-scroller").boundingBox();
  const target = await page.locator(`[data-tour-id="history"]`).boundingBox();
  expect(Math.abs((target?.y ?? 0) - (scroller?.y ?? 0))).toBeLessThan(8);

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("That is the tour");
  await expect(page.locator('[data-tourkit="card-wrap"]')).toHaveAttribute(
    "data-tourkit-placement",
    "center",
  );

  await page.click('[data-tourkit="next"]');
  await expect(page.locator("#shared-state")).toHaveText("idle");
});

test("a free plan skips the pro-only step and the progress reflects it", async ({ page }) => {
  await page.goto("/?plan=free");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("#launch-shared");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Post a ride");
  await expect(page.locator('[data-tourkit="progress-dot"]')).toHaveCount(4);

  await page.locator('[data-tourkit="hole-catcher"]').click();
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Your messages");

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Past rides");
});

test("the route hop happens before the next step becomes active", async ({ page }) => {
  await page.goto("/?plan=free");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.click("#launch-shared");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Post a ride");

  await page.locator('[data-tourkit="hole-catcher"]').click();

  await expect(page.locator("#inbox-screen")).toBeVisible();
  await expect(page.locator('[data-tourkit="root"]')).toHaveAttribute(
    "data-tourkit-state",
    "active",
  );
});
