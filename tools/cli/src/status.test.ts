import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRecordHandler, reachableUrls, startupLines } from "./record";

async function handlerInTemp() {
  const cwd = await mkdtemp(join(tmpdir(), "tourkit-status-"));
  const connected: string[] = [];
  const handle = createRecordHandler({
    cwd,
    outDir: "src/tour",
    onConnected: (origin) => connected.push(origin),
  });
  return { handle, connected };
}

describe("the handshake", () => {
  test("GET /status says the CLI is running and where it writes", async () => {
    const { handle } = await handlerInTemp();
    const response = await handle(new Request("http://127.0.0.1:5178/status"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, outDir: "src/tour" });
  });

  test("the app is announced once, not on every poll", async () => {
    const { handle, connected } = await handlerInTemp();
    const poll = () =>
      handle(
        new Request("http://127.0.0.1:5178/status", {
          headers: { origin: "http://localhost:3000" },
        }),
      );
    await poll();
    await poll();
    await poll();
    expect(connected).toEqual(["http://localhost:3000"]);
  });

  test("GET anywhere else is still method not allowed", async () => {
    const { handle } = await handlerInTemp();
    const response = await handle(new Request("http://127.0.0.1:5178/"));
    expect(response.status).toBe(405);
  });

  test("preflight advertises GET so a browser can poll it", async () => {
    const { handle } = await handlerInTemp();
    const response = await handle(
      new Request("http://127.0.0.1:5178/status", { method: "OPTIONS" }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toContain("GET");
  });
});

describe("reachableUrls", () => {
  test("loopback binding advertises one url", () => {
    expect(reachableUrls("127.0.0.1", 5178, ["192.168.1.24"])).toEqual(["http://127.0.0.1:5178"]);
  });

  test("binding every interface advertises the lan addresses a phone needs", () => {
    expect(reachableUrls("0.0.0.0", 5178, ["192.168.1.24"])).toEqual([
      "http://127.0.0.1:5178",
      "http://192.168.1.24:5178",
    ]);
  });
});

describe("startupLines", () => {
  test("says it is waiting, so a silent terminal is not mistaken for a broken one", () => {
    const lines = startupLines("127.0.0.1", "src/tour", ["http://127.0.0.1:5178"]).join("\n");
    expect(lines).toContain("waiting for your app");
    expect(lines).toContain("src/tour");
  });

  test("explains the wide binding when it is used", () => {
    const lines = startupLines("0.0.0.0", "src/tour", [
      "http://127.0.0.1:5178",
      "http://192.168.1.24:5178",
    ]).join("\n");
    expect(lines).toContain("192.168.1.24");
    expect(lines).toContain("phone");
  });
});
