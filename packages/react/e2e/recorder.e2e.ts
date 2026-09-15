import { execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

// This file injects into a shared fixture, so its tests must not interleave.
test.describe.configure({ mode: "serial" });

/** Same path shots.e2e.ts writes to: 06-recorder.png now shows the injected bar. */
const SHOTS = "C:/Users/ujjwa/AppData/Local/Temp/claude/shots";
const ROOT = process.cwd();
const SCRIPTS = path.resolve(ROOT, "..", "..", "skills", "tourkit", "scripts");
const FIXTURE_REL = path.join("e2e", "vanilla.html");
const FIXTURE_ABS = path.resolve(ROOT, FIXTURE_REL);

const node = (script: string, args: string[], cwd: string) =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(SCRIPTS, script), ...args], {
      cwd,
      encoding: "utf-8",
    }).trim(),
  );

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

let port = 0;
let serverDir = "";
let original: Buffer;

test.beforeAll(async () => {
  expect(fs.existsSync(SCRIPTS), `skill scripts not found at ${SCRIPTS}`).toBe(true);
  expect(fs.existsSync(FIXTURE_ABS), `fixture not found at ${FIXTURE_ABS}`).toBe(true);

  original = fs.readFileSync(FIXTURE_ABS);
  port = await freePort();
  // The server writes its tours and its own pid file relative to its cwd, so a temp
  // directory keeps the whole recording session out of the repo.
  serverDir = fs.mkdtempSync(path.join(os.tmpdir(), "tourkit-e2e-"));

  const started = node(
    "record-server.mjs",
    ["start", "--port", String(port), "--out", "tours"],
    serverDir,
  );
  expect(started.ok, `server did not start: ${JSON.stringify(started)}`).toBe(true);
});

test.afterAll(() => {
  try {
    node("record-server.mjs", ["stop"], serverDir);
  } catch {}
  // Restore whatever happened, so a mid-test failure never leaves the fixture edited.
  if (original) fs.writeFileSync(FIXTURE_ABS, original);
  try {
    fs.rmSync(serverDir, { recursive: true, force: true });
  } catch {}
});

test("the injected recorder captures a tour on a page with no component mounted", async ({
  page,
}) => {
  const injected = node("inject.mjs", ["--file", FIXTURE_REL, "--port", String(port)], ROOT);
  expect(injected.ok).toBe(true);
  expect(fs.readFileSync(FIXTURE_ABS, "utf-8")).toContain(`http://127.0.0.1:${port}/recorder.js`);

  await page.goto("/vanilla.html");

  // The bar stays hidden until the server answers its handshake.
  const bar = page.locator("[data-tourkit-recorder]");
  await expect(bar).toBeVisible();
  await expect(page.locator("[data-tourkit-recorder-outdir]")).toHaveText("→ tours");

  await page.click("[data-tourkit-recorder-toggle]");
  await expect(bar).toHaveAttribute("data-tourkit-recording", "true");

  // Clicking a real control while recording must record it, not fire it. #launch starts
  // the tour on this page; if preventDefault did not hold, a tour card would appear.
  await page.click("#launch");
  await page.click("#hero");
  await page.click("#inbox");

  await expect(page.locator("[data-tourkit-recorder-count]")).toHaveText("3 steps");
  await expect(page.locator('[data-tourkit="card"]')).toHaveCount(0);

  // The docs image. It used to come from the deleted React panel on recorder.html.
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/06-recorder.png` });

  await page.click("[data-tourkit-recorder-finish]");
  await expect(page.locator("[data-tourkit-recorder-status]")).toHaveText("sent");

  const tourFile = path.join(serverDir, "tours", "recorded.tour.json");
  await expect.poll(() => fs.existsSync(tourFile), { timeout: 5000 }).toBe(true);

  const tour = JSON.parse(fs.readFileSync(tourFile, "utf-8"));
  expect(tour.id).toBe("recorded");
  expect(tour.version).toBe(1);
  expect(tour.steps.map((step: { target: string | null }) => step.target)).toEqual([
    "#launch",
    "#hero",
    "#inbox",
    null,
  ]);

  // A selector target carries the fingerprint that lets the player heal it later. Its
  // presence proves buildFingerprint came through from @tourkit/core/dom, not a copy.
  const hero = tour.steps.find((step: { target: string | null }) => step.target === "#hero");
  expect(hero.fingerprint).toMatchObject({ tag: "button", text: "Hero button" });
  expect(hero.title).toBe("Hero button");

  // location.pathname is read at click time, which is what lets an SPA route change
  // be recorded without patching history.
  const recording = JSON.parse(
    fs.readFileSync(path.join(serverDir, "tours", "recorded.recording.json"), "utf-8"),
  );
  expect(recording.steps.map((step: { route: string }) => step.route)).toEqual([
    "/vanilla.html",
    "/vanilla.html",
    "/vanilla.html",
  ]);
});

test("removing the tag leaves the page byte-identical", () => {
  const before = fs.readFileSync(FIXTURE_ABS);
  expect(before.equals(original)).toBe(false); // the tag is still in from the previous test

  const removed = node("inject.mjs", ["--file", FIXTURE_REL, "--remove"], ROOT);
  expect(removed.ok).toBe(true);
  expect(removed.removed).toBe(true);

  const after = fs.readFileSync(FIXTURE_ABS);
  expect(after.equals(original)).toBe(true);
});

test("emit turns the recorded .tour.json into a .tour.ts", () => {
  const emitted = node("emit.mjs", [path.join("tours", "recorded.tour.json")], serverDir);
  expect(emitted.ok).toBe(true);
  expect(emitted.brittle).toEqual(["#launch", "#hero", "#inbox"]);

  const source = fs.readFileSync(path.join(serverDir, "tours", "recorded.tour.ts"), "utf-8");
  expect(source).toContain('import type { TourConfig } from "@tourkit/core";');
  expect(source).toContain("export const recorded: TourConfig = {");
  expect(source).toContain('target: "#hero",');
  expect(source).toContain("target: null,");
});

test("inject refuses a path inside node_modules", () => {
  let failed = false;
  try {
    execFileSync(
      process.execPath,
      [
        path.join(SCRIPTS, "inject.mjs"),
        "--file",
        "node_modules/some-dep/index.html",
        "--port",
        "1",
      ],
      { cwd: ROOT, encoding: "utf-8" },
    );
  } catch (error) {
    failed = true;
    const output = String((error as { stdout?: string }).stdout ?? "");
    expect(JSON.parse(output.trim())).toMatchObject({ ok: false, error: "hard_excluded" });
  }
  expect(failed).toBe(true);
});
