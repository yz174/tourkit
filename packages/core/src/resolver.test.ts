import { describe, expect, test } from "bun:test";
import { indexOfStep, stepAt, visibleSteps } from "./resolver";
import type { TourConfig } from "./types";

type Ctx = { isHost: boolean };

const config: TourConfig<Ctx> = {
  id: "onboarding",
  version: 1,
  steps: [{ id: "a" }, { id: "host-only", when: (ctx) => ctx.isHost }, { id: "b" }],
};

describe("visibleSteps", () => {
  test("keeps steps with no predicate", () => {
    expect(visibleSteps(config, { isHost: false }).map((step) => step.id)).toEqual(["a", "b"]);
  });

  test("keeps steps whose predicate passes", () => {
    expect(visibleSteps(config, { isHost: true }).map((step) => step.id)).toEqual([
      "a",
      "host-only",
      "b",
    ]);
  });
});

describe("stepAt", () => {
  test("returns null outside the range instead of undefined", () => {
    const steps = visibleSteps(config, { isHost: false });

    expect(stepAt(steps, 0)?.id).toBe("a");
    expect(stepAt(steps, 2)).toBe(null);
    expect(stepAt(steps, -1)).toBe(null);
  });
});

describe("indexOfStep", () => {
  test("indexes against the visible list, not the authored one", () => {
    const steps = visibleSteps(config, { isHost: false });

    expect(indexOfStep(steps, "b")).toBe(1);
    expect(indexOfStep(steps, "host-only")).toBe(-1);
  });
});
