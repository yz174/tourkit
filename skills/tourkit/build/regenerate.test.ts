import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { generateTourFile, recordingToTour } from "../scripts/emit.mjs";

/**
 * The golden-file guarantee, moved out of tools/cli before that package was deleted.
 *
 * It now pins the whole chain the skill actually walks, recording to `.tour.json` to `.tour.ts`,
 * rather than the single hop the CLI's codegen took. Both intermediate and final are committed, so
 * a change to either end of `emit.mjs` fails here instead of silently rewriting someone's tour.
 */
const FIXTURES = path.resolve(import.meta.dir, "..", "..", "..", "packages", "react", "e2e");

/**
 * Compared with line endings normalized. The working tree is CRLF under core.autocrlf=true while
 * git stores LF, so a byte comparison would test the checkout, not the codegen. Everything else is
 * still exact: whitespace, key order, trailing newline.
 */
function read(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), "utf-8").replace(/\r\n/g, "\n");
}

const recording = JSON.parse(read("recorded-walkthrough.recording.json"));

describe("the committed generated tour", () => {
  test("recording to .tour.json is identical to the committed intermediate", () => {
    const produced = `${JSON.stringify(recordingToTour(recording), null, 2)}\n`;

    expect(produced).toBe(read("recorded-walkthrough.tour.json"));
  });

  test(".tour.json to .tour.ts is identical to the committed output", () => {
    const tour = JSON.parse(read("recorded-walkthrough.tour.json"));

    expect(generateTourFile(tour)).toBe(read("recorded-walkthrough.tour.ts"));
  });

  test("the whole chain end to end still lands on the committed .tour.ts", () => {
    expect(generateTourFile(recordingToTour(recording))).toBe(read("recorded-walkthrough.tour.ts"));
  });

  test("the fixture is a real recording, not an empty one", () => {
    expect(recording.steps.length).toBeGreaterThan(3);
    expect(recording.steps.some((step: { registered: boolean }) => step.registered)).toBe(true);
    expect(recording.steps.some((step: { registered: boolean }) => !step.registered)).toBe(true);
  });

  test("a selector target keeps the fingerprint that heals it", () => {
    const tour = recordingToTour(recording);
    const healed = tour.steps.filter((step: { fingerprint?: unknown }) => step.fingerprint);

    expect(healed.length).toBeGreaterThan(0);
    for (const step of healed) expect(step.target).toMatch(/[#.[\s>]/);
  });
});
