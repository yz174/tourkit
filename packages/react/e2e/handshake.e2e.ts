import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "../../../tools/cli/dist/index.js");
const PORT = 5179;
const PANEL = "[data-tourkit-recorder]";

type Server = { stop: () => void; outDir: string; cwd: string };

async function startRecordServer(): Promise<Server> {
  const cwd = await mkdtemp(join(tmpdir(), "tourkit-handshake-"));
  const child = spawn(process.execPath, [CLI, "record", "tours"], {
    cwd,
    env: { ...process.env, TOURKIT_PORT: String(PORT) },
    stdio: "ignore",
  });

  // The CLI is listening as soon as the handshake answers.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/status`);
      if (response.ok) break;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { stop: () => child.kill(), outDir: "tours", cwd };
}

test("the panel follows the CLI, and a real recording reaches disk", async ({ page }) => {
  const server = await startRecordServer();

  try {
    // The recorder defaults to port 5178; this run uses its own port so it cannot collide
    // with a CLI the developer already has open.
    await page.addInitScript((port) => {
      const original = window.fetch;
      window.fetch = (input, init) => original(String(input).replace(":5178", `:${port}`), init);
    }, PORT);
    await page.goto("/recorder.html?autoshow=1");

    await expect(page.locator(PANEL)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("[data-tourkit-recorder-outdir]")).toHaveText("→ tours");

    await page.click("[data-tourkit-recorder-toggle]");
    await page.click('[data-tour-id="post-ride"]');
    await page.click('[data-tour-id="inbox"]');
    await page.click("[data-tourkit-recorder-finish]");

    await expect(page.locator("[data-tourkit-recorder-status]")).toHaveText("sent");

    const written = await readFile(
      join(server.cwd, "tours", "playground-walkthrough.tour.ts"),
      "utf8",
    );
    expect(written).toContain('target: "post-ride"');
    expect(written).toContain('target: "inbox"');

    // Stopping the CLI takes the panel away again.
    server.stop();
    await expect(page.locator(PANEL)).toBeHidden({ timeout: 10000 });
  } finally {
    server.stop();
    // Windows keeps a handle on the killed process's cwd for a moment; a stale temp dir is not
    // worth failing a passing test over.
    await rm(server.cwd, { recursive: true, force: true, maxRetries: 5 }).catch(() => undefined);
  }
});
