import { expect, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function elementOverTarget(page: Page, selector: string) {
  return page.locator(selector).evaluate((node) => {
    const box = node.getBoundingClientRect();
    const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return top?.getAttribute("data-tourkit") ?? top?.id ?? top?.tagName;
  });
}

test("block stops a real click reaching the target", async ({ page }) => {
  await page.click("#launch-demo");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  expect(await elementOverTarget(page, "#hero")).toBe("shield");
  expect(await elementOverTarget(page, "#in-modal")).toBe("shield");
  await page.locator("#hero").click({ force: true });
  await expect(page.locator("#hero-log")).toHaveText("0");
});

test("passthrough lets a real click reach the target and does not advance", async ({ page }) => {
  await page.click("#launch-passthrough");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Press it yourself");

  expect(await elementOverTarget(page, "#hero")).toBe("hero");

  await page.locator("#hero").click();
  await expect(page.locator("#hero-log")).toHaveText("1");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Press it yourself");
});

test("advance-on-press catches the press and moves to the next step", async ({ page }) => {
  await page.click("#launch-press");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Press to continue");

  expect(await elementOverTarget(page, "#hero")).toBe("hole-catcher");

  await page.locator('[data-tourkit="hole-catcher"]').click();
  await expect(page.locator('[data-tourkit="card"]')).toContainText("You pressed it");
  await expect(page.locator("#hero-log")).toHaveText("0");
});

test("advance-on-press still blocks the rest of the page", async ({ page }) => {
  await page.click("#launch-press");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Press to continue");

  expect(await elementOverTarget(page, "#in-modal")).toBe("shield");
});

test("scroll block start aligns the target to the top of its scroller", async ({ page }) => {
  await page.click("#launch-scroll-start");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Aligned to start");
  await page.waitForTimeout(600);

  const scroller = await page.locator("#scroller").boundingBox();
  const target = await page.locator("#deep").boundingBox();

  expect(Math.abs((target?.y ?? 0) - (scroller?.y ?? 0))).toBeLessThan(6);
});

test("scroll false leaves the scroll position alone", async ({ page }) => {
  const before = await page.locator("#scroller").evaluate((node) => node.scrollTop);
  await page.click("#launch-no-scroll");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Left where it was");
  await page.waitForTimeout(600);

  const after = await page.locator("#scroller").evaluate((node) => node.scrollTop);
  expect(after).toBe(before);
});
