import { expect, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function holeBounds(page: Page) {
  return page.evaluate(() => {
    const backdrop = document.querySelector('[data-tourkit="backdrop"]');
    if (!backdrop) return null;
    const clip = getComputedStyle(backdrop).clipPath;
    const first = clip.indexOf('"');
    const last = clip.lastIndexOf('"');
    if (first === -1 || last <= first) return null;
    const data = clip.slice(first + 1, last);
    const inner = data.slice(data.indexOf("Z") + 1);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", inner);
    svg.appendChild(path);
    document.body.appendChild(svg);
    const box = path.getBBox();
    svg.remove();
    return { x: box.x, y: box.y, width: box.width, height: box.height, viewport: data };
  });
}

async function advance(page: Page) {
  await page.click('[data-tourkit="next"]');
}

test("the cutout lands on the target as the browser lays it out", async ({ page }) => {
  await page.click("#launch-demo");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("The hero");

  const target = await page.locator("#hero").boundingBox();
  const hole = await holeBounds(page);

  expect(target).not.toBeNull();
  expect(hole).not.toBeNull();
  expect(Math.abs((hole?.x ?? 0) - ((target?.x ?? 0) - 4))).toBeLessThan(1.5);
  expect(Math.abs((hole?.y ?? 0) - ((target?.y ?? 0) - 4))).toBeLessThan(1.5);
  expect(Math.abs((hole?.width ?? 0) - ((target?.width ?? 0) + 8))).toBeLessThan(1.5);
  expect(Math.abs((hole?.height ?? 0) - ((target?.height ?? 0) + 8))).toBeLessThan(1.5);
});

test("the card is anchored to the target and stays inside the viewport", async ({ page }) => {
  await page.click("#launch-demo");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  const target = await page.locator("#hero").boundingBox();
  const card = await page.locator('[data-tourkit="card-wrap"]').boundingBox();
  const viewport = page.viewportSize();

  expect(card).not.toBeNull();
  expect(card?.x).toBeGreaterThanOrEqual(0);
  expect(card?.y).toBeGreaterThanOrEqual(0);
  expect((card?.x ?? 0) + (card?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
  expect((card?.y ?? 0) - ((target?.y ?? 0) + (target?.height ?? 0))).toBeGreaterThan(0);
  expect((card?.y ?? 0) - ((target?.y ?? 0) + (target?.height ?? 0))).toBeLessThan(40);
});

test("a target inside a scroll container is scrolled into view and tracked while scrolling", async ({
  page,
}) => {
  await page.click("#launch-demo");
  await advance(page);
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Inside a scroller");
  await page.waitForTimeout(500);

  const before = await page.locator("#deep").boundingBox();
  const holeBefore = await holeBounds(page);
  expect(before?.y).toBeGreaterThan(0);
  expect(Math.abs((holeBefore?.y ?? 0) - ((before?.y ?? 0) - 4))).toBeLessThan(2);

  await page.locator("#scroller").evaluate((node) => {
    node.scrollTop += 120;
  });
  await page.waitForTimeout(300);

  const after = await page.locator("#deep").boundingBox();
  const holeAfter = await holeBounds(page);

  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeGreaterThan(50);
  expect(Math.abs((holeAfter?.y ?? 0) - ((after?.y ?? 0) - 4))).toBeLessThan(2);
});

test("a target inside a stacked modal is cut out correctly", async ({ page }) => {
  await page.click("#launch-demo");
  await advance(page);
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Inside a scroller");
  await advance(page);
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Inside a modal");
  await page.waitForTimeout(400);

  const target = await page.locator("#in-modal").boundingBox();
  const hole = await holeBounds(page);

  expect(Math.abs((hole?.x ?? 0) - ((target?.x ?? 0) - 4))).toBeLessThan(2);
  expect(Math.abs((hole?.width ?? 0) - ((target?.width ?? 0) + 8))).toBeLessThan(2);
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();
});

test("the final step with no target centres the card and collapses the hole", async ({ page }) => {
  await page.click("#launch-demo");
  for (let step = 0; step < 3; step += 1) {
    await advance(page);
    await page.waitForTimeout(300);
  }

  await expect(page.locator('[data-tourkit="card"]')).toContainText("Finished");
  await expect(page.locator('[data-tourkit="card-wrap"]')).toHaveAttribute(
    "data-tourkit-placement",
    "center",
  );

  const hole = await holeBounds(page);
  expect(hole?.width).toBeLessThan(1);
  expect(hole?.height).toBeLessThan(1);
});

test("the shield blocks clicks on the page underneath", async ({ page }) => {
  await page.click("#launch-demo");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  const hit = await page.locator("#hero").evaluate((node) => {
    const box = node.getBoundingClientRect();
    const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return top?.getAttribute("data-tourkit") ?? top?.tagName;
  });

  expect(hit).toBe("shield");
});

test("Escape ends the tour and removes the overlay", async ({ page }) => {
  await page.click("#launch-demo");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.locator('[data-tourkit="root"]')).toHaveCount(0);
});

test("resizing the window keeps the cutout on the target", async ({ page }) => {
  await page.click("#launch-demo");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  await page.setViewportSize({ width: 700, height: 700 });
  await page.waitForTimeout(300);

  const target = await page.locator("#hero").boundingBox();
  const hole = await holeBounds(page);

  expect((hole?.viewport ?? "").replace(/\s+/g, "")).toContain("H700V700");
  expect(Math.abs((hole?.x ?? 0) - ((target?.x ?? 0) - 4))).toBeLessThan(2);
});

test("focus lands in the card and Tab stays inside it", async ({ page }) => {
  await page.click("#launch-demo");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  const focused = await page.evaluate(
    () => document.activeElement?.getAttribute("data-tourkit") ?? null,
  );
  expect(focused).toBe("next");

  await page.keyboard.press("Tab");
  const stillInside = await page.evaluate(() =>
    document.querySelector('[data-tourkit="card-wrap"]')?.contains(document.activeElement),
  );
  expect(stillInside).toBe(true);
});
