import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { generateTourFile, type Recording } from "./codegen";

const fixtures = join(import.meta.dir, "..", "..", "..", "packages", "react", "e2e");

describe("the committed generated tour", () => {
  test("is byte-identical to what the codegen produces today", async () => {
    const recording = (await Bun.file(
      join(fixtures, "recorded-walkthrough.recording.json"),
    ).json()) as Recording;
    const committed = await Bun.file(join(fixtures, "recorded-walkthrough.tour.ts")).text();

    expect(generateTourFile(recording)).toBe(committed);
  });
});
