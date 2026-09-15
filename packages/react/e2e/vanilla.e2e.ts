import { expect, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/vanilla.html");
});

/** The same clip-path reading tour.e2e.ts does, so both players are held to one measurement. */
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

test("no React is loaded on the page", async ({ page }) => {
  await page.click("#launch");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  const reactOnPage = await page.evaluate(() => {
    const globals = "React" in window || "ReactDOM" in window;
    const card = document.querySelector('[data-tourkit="card"]');
    // React tags every node it creates with __reactFiber$… / __reactProps$… keys.
    const tagged = card ? Object.keys(card).some((key) => key.startsWith("__react")) : false;
    const scripts = [...document.scripts].map((script) => script.src).join(" ");
    return { globals, tagged, mentionsReact: /react/i.test(scripts) };
  });

  expect(reactOnPage).toEqual({ globals: false, tagged: false, mentionsReact: false });
});

test("the plain-DOM player runs a four-step tour", async ({ page }) => {
  await page.click("#launch");

  await expect(page.locator('[data-tourkit="root"]')).toHaveAttribute(
    "data-tourkit-state",
    "active",
  );
  await expect(page.locator('[data-tourkit="card"]')).toContainText("The hero");
  await expect(page.locator('[data-tourkit="progress-dot"]')).toHaveCount(4);

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Your inbox");

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Down the list");

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("All done");
  await expect(page.locator('[data-tourkit="next"]')).toHaveText("Done");

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="root"]')).toHaveCount(0);
});

test("the cutout lands on the target as the browser lays it out", async ({ page }) => {
  await page.click("#launch");
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

test("a target registered by id is cut out just like a selector one", async ({ page }) => {
  await page.click("#launch");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("The hero");
  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Your inbox");

  const target = await page.locator("#inbox").boundingBox();
  const hole = await holeBounds(page);

  expect(Math.abs((hole?.x ?? 0) - ((target?.x ?? 0) - 4))).toBeLessThan(1.5);
  expect(Math.abs((hole?.width ?? 0) - ((target?.width ?? 0) + 8))).toBeLessThan(1.5);
});

test("the card is anchored to the target and stays inside the viewport", async ({ page }) => {
  await page.click("#launch");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  const target = await page.locator("#hero").boundingBox();
  const card = await page.locator('[data-tourkit="card-wrap"]').boundingBox();
  const viewport = page.viewportSize();

  expect(card).not.toBeNull();
  expect(card?.x).toBeGreaterThanOrEqual(0);
  expect(card?.y).toBeGreaterThanOrEqual(0);
  expect((card?.x ?? 0) + (card?.width ?? 0)).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
  expect((card?.y ?? 0) + (card?.height ?? 0)).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
  expect((card?.y ?? 0) + (card?.height ?? 0)).toBeGreaterThan(target?.y ?? 0);
});

test("the shield blocks clicks on the page underneath", async ({ page }) => {
  await page.click("#launch");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  await expect(page.locator('[data-tourkit="shield"]')).toBeVisible();
  await expect(page.locator('[data-tourkit="root"]')).toHaveAttribute(
    "data-tourkit-interaction",
    "block",
  );
});

test("Escape ends the tour and removes the overlay", async ({ page }) => {
  await page.click("#launch");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.locator('[data-tourkit="root"]')).toHaveCount(0);
  await expect(page.locator("#state")).toHaveText("idle");
});

test("focus lands in the card and Tab stays inside it", async ({ page }) => {
  await page.click("#launch");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-tourkit") ?? null))
    .toBe("next");

  await page.keyboard.press("Tab");
  const stillInside = await page.evaluate(() =>
    document.querySelector('[data-tourkit="card-wrap"]')?.contains(document.activeElement),
  );
  expect(stillInside).toBe(true);
});

test("the stable class names the themes hang off are all present", async ({ page }) => {
  await page.click("#launch");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();

  for (const selector of [
    ".tourkit-root",
    ".tourkit-overlay",
    ".tourkit-shield",
    ".tourkit-card",
    ".tourkit-title",
    ".tourkit-body",
    ".tourkit-next",
    ".tourkit-progress",
    ".tourkit-progress-step",
  ]) {
    await expect(page.locator(selector).first()).toBeAttached();
  }
});
