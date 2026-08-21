import { expect, type Page, test } from "@playwright/test";

const OUT = "C:/Users/ujjwa/AppData/Local/Temp/claude/shots";

async function fresh(page: Page, url = "/") {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test("capture the tour states", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 760 });
  await fresh(page);

  await page.click("#launch-demo");
  await expect(page.locator('[data-tourkit="card"]')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/01-hero.png` });

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Inside a scroller");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/02-scroller.png` });

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Inside a modal");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/03-modal.png` });

  await page.click('[data-tourkit="next"]');
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Finished");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-final.png` });
});

test("capture the generated tour", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 760 });
  await fresh(page);

  await page.fill("#ask-input", "how do I cancel a ride?");
  await page.click("#ask-submit");
  await expect(page.locator('[data-tourkit="card"]')).toContainText("Open your rides");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/05-generated.png` });
});

test("capture the recorder", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.goto("/recorder.html");

  await page.click("[data-tourkit-recorder-toggle]");
  await page.click('[data-tour-id="post-ride"]');
  await page.click('[data-tour-id="inbox"]');
  await page.click(".danger-btn");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/06-recorder.png` });
});
