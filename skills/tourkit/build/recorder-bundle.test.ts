import { describe, expect, test } from "bun:test";
import { buildRecorder, OUTPUT, readCommitted } from "./build-recorder.mjs";

describe("the committed recorder bundle", () => {
  test("matches what its source builds today", () => {
    const committed = readCommitted();
    expect(committed).not.toBe(null);
    expect(committed).toBe(buildRecorder());
  });

  test("carries the element description logic from @tourkit/core/dom", () => {
    const committed = readCommitted() ?? "";
    // If these ever go missing, the bundle was hand-edited or the entry stopped
    // importing from core, which is exactly the drift the bundle exists to prevent.
    expect(committed).toContain("function describeElement");
    expect(committed).toContain("function buildFingerprint");
    expect(committed).toContain("function cssPath");
  });

  test("pulls in no player code, so the injected script stays small", () => {
    const committed = readCommitted() ?? "";
    expect(committed).not.toContain("@floating-ui/dom");
    expect(committed).not.toContain("computePosition");
    expect(Buffer.byteLength(committed)).toBeLessThan(40_000);
  });

  test("is marked generated so nobody edits it by hand", () => {
    const committed = readCommitted() ?? "";
    expect(committed.slice(0, 300)).toContain("@generated");
    expect(OUTPUT.replace(/\\/g, "/")).toContain("skills/tourkit/scripts/recorder-browser.js");
  });
});
