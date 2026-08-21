import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function ask(page: import("@playwright/test").Page, question: string) {
  await page.fill("#ask-input", question);
  await page.click("#ask-submit");
}

test("a question turns into a real tour of the real interface", async ({ page }) => {
  await ask(page, "how do I cancel a ride?");

  await expect(page.locator("#ask-status")).toHaveText("ready");
  await expect(page.locator("#ask-steps")).toHaveText("4");

  await expect(page.locator('[data-tourkit="card"]')).toContainText("Open your rides");

  const target = await page.locator('[data-tour-id="my-rides"]').boundingBox();
  const hole = await page.evaluate(() => {
    const clip = getComputedStyle(
      document.querySelector('[data-tourkit="backdrop"]') as Element,
    ).clipPath;
    const data = clip.slice(clip.indexOf('"') + 1, clip.lastIndexOf('"'));
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", data.slice(data.indexOf("Z") + 1));
    svg.appendChild(path);
    document.body.appendChild(svg);
    const box = path.getBBox();
    svg.remove();
    return { x: box.x, y: box.y };
  });

  expect(Math.abs(hole.x - ((target?.x ?? 0) - 4))).toBeLessThan(2);

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Open the menu");
  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Cancel it");
  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card-wrap"]')).toHaveAttribute(
    "data-tourkit-placement",
    "center",
  );
});

test("a target the model invented is rejected and nothing is highlighted", async ({ page }) => {
  await ask(page, "invent something");

  await expect(page.locator("#ask-status")).toHaveText("failed");
  await expect(page.locator("#ask-error")).toHaveText("unknown-target");
  await expect(page.locator('[data-tourkit="root"]')).toHaveCount(0);
});

test("a failing endpoint fails cleanly with no overlay", async ({ page }) => {
  await ask(page, "fail please");

  await expect(page.locator("#ask-status")).toHaveText("failed");
  await expect(page.locator('[data-tourkit="root"]')).toHaveCount(0);
});

test("the same question a second time is served from cache without a request", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/tourkit", async (route) => {
    calls += 1;
    await route.continue();
  });

  await ask(page, "how do I cancel a ride?");
  await expect(page.locator("#ask-status")).toHaveText("ready");
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-tourkit="root"]')).toHaveCount(0);

  await ask(page, "  How do I cancel a ride?  ");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Open your rides");

  expect(calls).toBe(1);
});

test("question to first highlight, with the model call stubbed", async ({ page }) => {
  const started = Date.now();
  await ask(page, "how do I cancel a ride?");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Open your rides");
  const elapsed = Date.now() - started;

  console.log(`question to first highlight (stubbed model): ${elapsed}ms`);
  expect(elapsed).toBeLessThan(2000);
});
