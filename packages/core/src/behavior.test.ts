import { describe, expect, test } from "bun:test";
import { type BehaviorOverrides, withBehavior, withBehaviorReport } from "./behavior";
import type { TourConfig } from "./types";

type Ctx = { plan: "free" | "pro" };

function config(): TourConfig<Ctx> {
  return {
    id: "onboarding",
    version: 1,
    steps: [
      { id: "post-ride", target: "post-ride", title: "Offer a seat" },
      { id: "billing", target: "billing", title: "Billing lives here" },
      { id: "done", target: null, title: "That is the tour" },
    ],
  };
}

describe("withBehavior", () => {
  test("attaches a function field the JSON could not carry", () => {
    const when = (context: Ctx) => context.plan === "pro";

    const merged = withBehavior(config(), { billing: { when } });

    expect(merged.steps[1]?.when).toBe(when);
    expect(merged.steps[1]?.when?.({ plan: "pro" })).toBe(true);
    expect(merged.steps[1]?.when?.({ plan: "free" })).toBe(false);
  });

  test("leaves the steps it was not given alone", () => {
    const merged = withBehavior(config(), { billing: { when: () => true } });

    expect(merged.steps[0]?.when).toBeUndefined();
    expect(merged.steps[2]?.when).toBeUndefined();
  });

  test("keeps the data fields the emitter wrote", () => {
    const merged = withBehavior(config(), { "post-ride": { when: () => true } });

    expect(merged.steps[0]?.title).toBe("Offer a seat");
    expect(merged.steps[0]?.target).toBe("post-ride");
  });

  test("merges a gate and its timeout together", async () => {
    const gate = async () => true;

    const merged = withBehavior(config(), {
      billing: { gate, gateTimeoutMs: 3000, onGateTimeout: "skip" },
    });

    const billing = merged.steps[1];
    expect(billing).toBeDefined();
    if (!billing) return;

    expect(billing.gate).toBe(gate);
    expect(billing.gateTimeoutMs).toBe(3000);
    expect(billing.onGateTimeout).toBe("skip");
    expect(await billing.gate?.({ context: { plan: "pro" }, step: billing })).toBe(true);
  });

  test("overrides a data field the JSON already set", () => {
    const merged = withBehavior(config(), { billing: { title: "Where billing lives" } });

    expect(merged.steps[1]?.title).toBe("Where billing lives");
  });

  test("never lets an override rewrite the step id it is keyed by", () => {
    // `id` is excluded from the override type, so this is only reachable by casting. The runtime
    // guard still has to hold: a config's step ids are what every override is keyed by.
    const overrides = { billing: { id: "something-else" } } as unknown as BehaviorOverrides<Ctx>;

    const merged = withBehavior(config(), overrides);

    expect(merged.steps.map((step) => step.id)).toEqual(["post-ride", "billing", "done"]);
  });

  test("ignores an override naming a step id that does not exist", () => {
    const merged = withBehavior(config(), { nope: { when: () => false } });

    expect(merged.steps).toHaveLength(3);
    expect(merged.steps.map((step) => step.id)).toEqual(["post-ride", "billing", "done"]);
  });

  test("does not mutate the config it was given", () => {
    const original = config();

    withBehavior(original, { billing: { when: () => true } });

    expect(original.steps[1]?.when).toBeUndefined();
  });

  test("carries the rest of the config through untouched", () => {
    const source = { ...config(), entryRoute: "/", dismissible: false };

    const merged = withBehavior(source, { billing: { when: () => true } });

    expect(merged.id).toBe("onboarding");
    expect(merged.version).toBe(1);
    expect(merged.entryRoute).toBe("/");
    expect(merged.dismissible).toBe(false);
  });

  test("an empty override set is a no-op", () => {
    const merged = withBehavior(config(), {});

    expect(merged.steps.map((step) => step.title)).toEqual([
      "Offer a seat",
      "Billing lives here",
      "That is the tour",
    ]);
  });

  test("attaches onEnter and onAdvance", async () => {
    const seen: string[] = [];

    const merged = withBehavior(config(), {
      "post-ride": {
        onEnter: () => void seen.push("enter"),
        onAdvance: () => void seen.push("advance"),
      },
    });

    const info = { tourId: "onboarding", stepId: "post-ride", index: 0, total: 3 };
    await merged.steps[0]?.onEnter?.({ plan: "free" }, info);
    await merged.steps[0]?.onAdvance?.({ plan: "free" }, info);

    expect(seen).toEqual(["enter", "advance"]);
  });
});

describe("withBehaviorReport", () => {
  test("names the override keys that matched nothing, so a renamed step is caught", () => {
    const { unmatched } = withBehaviorReport(config(), {
      billing: { when: () => true },
      "billing-old": { when: () => true },
      typo: { gate: () => true },
    });

    expect(unmatched.sort()).toEqual(["billing-old", "typo"]);
  });

  test("reports nothing unmatched when every key hits", () => {
    const { unmatched, config: merged } = withBehaviorReport(config(), {
      "post-ride": { when: () => true },
      billing: { when: () => true },
    });

    expect(unmatched).toEqual([]);
    expect(merged.steps[0]?.when).toBeDefined();
  });

  test("an explicitly undefined override is not counted as unmatched", () => {
    const { unmatched } = withBehaviorReport(config(), { ghost: undefined });

    expect(unmatched).toEqual([]);
  });
});
