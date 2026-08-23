import { describe, expect, test } from "bun:test";
import { defaultRecordEndpoint, hostFromScriptUrl, statusUrl } from "./endpoint";

describe("hostFromScriptUrl", () => {
  test("takes the host Metro is served from", () => {
    expect(hostFromScriptUrl("http://192.168.1.24:8081/index.bundle?platform=ios")).toBe(
      "192.168.1.24",
    );
    expect(hostFromScriptUrl("http://localhost:8081/index.bundle")).toBe("localhost");
  });

  test("a release build has no script url", () => {
    expect(hostFromScriptUrl(null)).toBeNull();
    expect(hostFromScriptUrl(undefined)).toBeNull();
    expect(hostFromScriptUrl("")).toBeNull();
  });
});

describe("defaultRecordEndpoint", () => {
  test("a device reaches the machine running the CLI, not its own loopback", () => {
    expect(defaultRecordEndpoint({ scriptUrl: "http://192.168.1.24:8081/index.bundle" })).toBe(
      "http://192.168.1.24:5178/record",
    );
  });

  test("android without a script url uses the emulator alias for the host", () => {
    expect(defaultRecordEndpoint({ platform: "android" })).toBe("http://10.0.2.2:5178/record");
  });

  test("ios without a script url uses loopback, which the simulator shares", () => {
    expect(defaultRecordEndpoint({ platform: "ios" })).toBe("http://127.0.0.1:5178/record");
  });

  test("the port is overridable", () => {
    expect(defaultRecordEndpoint({ platform: "ios", port: 6000 })).toBe(
      "http://127.0.0.1:6000/record",
    );
  });
});

describe("statusUrl", () => {
  test("swaps the record path for the handshake", () => {
    expect(statusUrl("http://10.0.2.2:5178/record")).toBe("http://10.0.2.2:5178/status");
    expect(statusUrl("http://10.0.2.2:5178/record/")).toBe("http://10.0.2.2:5178/status");
  });
});

describe("a dev-server origin rather than a bundle url", () => {
  test("getDevServer().url has a trailing slash and no path", () => {
    expect(hostFromScriptUrl("http://192.168.0.104:8081/")).toBe("192.168.0.104");
    expect(defaultRecordEndpoint({ scriptUrl: "http://192.168.0.104:8081/" })).toBe(
      "http://192.168.0.104:5178/record",
    );
  });

  test("a physical device never falls back to its own loopback when Metro is known", () => {
    const endpoint = defaultRecordEndpoint({
      scriptUrl: "http://192.168.0.104:8081/index.bundle?platform=ios",
      platform: "ios",
    });
    expect(endpoint).not.toContain("127.0.0.1");
    expect(endpoint).toContain("192.168.0.104");
  });
});
