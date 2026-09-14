import { describe, expect, test } from "bun:test";
import { TourEngine } from "./engine";
import type { TourConfig, TourStep } from "./types";

type Ctx = { isHost: boolean };

const context: Ctx = { isHost: false };

function tour(steps: TourStep<Ctx>[], version = 1): TourConfig<Ctx> {
  return { id: "onboarding", version, steps };
}

const four = () => tour([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);

describe("starting partway in", () => {
  test("start at an index opens that step", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });

    await engine.start("onboarding", { at: 2 });

    expect(engine.getSnapshot().step?.id).toBe("c");
    expect(engine.getSnapshot().stepIndex).toBe(2);
  });

  test("start at a step id opens that step", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });

    await engine.start("onboarding", { at: "d" });

    expect(engine.getSnapshot().step?.id).toBe("d");
  });

  test("start at an index out of range falls back to the first step", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });

    await engine.start("onboarding", { at: 99 });

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("start at an unknown step id falls back to the first step", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });

    await engine.start("onboarding", { at: "nope" });

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("an explicit start position beats a saved resume position", async () => {
    const store = new Map<string, string>([
      ["tour:onboarding:v1", JSON.stringify({ outcome: "pending", stepId: "b", updatedAt: 1 })],
    ]);
    const engine = new TourEngine<Ctx>({
      tours: [four()],
      context,
      storage: {
        async get(key) {
          return store.get(key) ?? null;
        },
        async set(key, value) {
          store.set(key, value);
        },
        async remove(key) {
          store.delete(key);
        },
      },
    });

    await engine.start("onboarding", { at: "d" });

    expect(engine.getSnapshot().step?.id).toBe("d");
  });

  test("start at an index counts visible steps only", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "hidden", when: (ctx) => ctx.isHost }, { id: "c" }])],
      context,
    });

    await engine.start("onboarding", { at: 1 });

    expect(engine.getSnapshot().step?.id).toBe("c");
  });
});

describe("jumping", () => {
  test("moveTo opens the step at that index", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding");

    await engine.moveTo(3);

    expect(engine.getSnapshot().step?.id).toBe("d");
  });

  test("moveTo ignores an index out of range", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding");

    await engine.moveTo(99);

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("moveTo does nothing when no tour is running", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });

    await engine.moveTo(2);

    expect(engine.getSnapshot().status).toBe("idle");
  });

  test("show opens the step with that id", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding");

    await engine.show("c");

    expect(engine.getSnapshot().step?.id).toBe("c");
  });

  test("show ignores an unknown step id", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding");

    await engine.show("nope");

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("moveTo emits step:exit for the step it leaves", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [four()],
      context,
      onEvent: (name, event) => seen.push(`${name}:${event.stepId}`),
    });
    await engine.start("onboarding");
    seen.length = 0;

    await engine.moveTo(2);

    expect(seen[0]).toBe("step:exit:a");
    expect(seen).toContain("step:enter:c");
  });

  test("moveTo does not run onAdvance on the step it leaves", async () => {
    let ran = false;
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          {
            id: "a",
            onAdvance: () => {
              ran = true;
            },
          },
          { id: "b" },
        ]),
      ],
      context,
    });
    await engine.start("onboarding");

    await engine.moveTo(1);

    expect(ran).toBe(false);
  });
});

describe("reading neighbouring steps", () => {
  test("getNextStep returns the following visible step", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding");

    expect(engine.getNextStep()?.id).toBe("b");
  });

  test("getNextStep returns null on the last step", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding", { at: 3 });

    expect(engine.getNextStep()).toBe(null);
  });

  test("getPreviousStep returns null on the first step", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding");

    expect(engine.getPreviousStep()).toBe(null);
  });

  test("getPreviousStep returns the step before the active one", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding", { at: 2 });

    expect(engine.getPreviousStep()?.id).toBe("b");
  });

  test("getById finds a step in the running tour", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding");

    expect(engine.getById("c")?.id).toBe("c");
  });

  test("getById returns null for an unknown id", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });
    await engine.start("onboarding");

    expect(engine.getById("nope")).toBe(null);
  });

  test("getById skips a step hidden by when", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "hidden", when: (ctx) => ctx.isHost }])],
      context,
    });
    await engine.start("onboarding");

    expect(engine.getById("hidden")).toBe(null);
  });
});

describe("position flags on the snapshot", () => {
  test("the first step of several is first, not last, and has a next", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });

    await engine.start("onboarding");
    const snapshot = engine.getSnapshot();

    expect(snapshot.isFirst).toBe(true);
    expect(snapshot.isLast).toBe(false);
    expect(snapshot.hasNext).toBe(true);
    expect(snapshot.hasPrev).toBe(false);
  });

  test("the last step is last and has no next", async () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });

    await engine.start("onboarding", { at: 3 });
    const snapshot = engine.getSnapshot();

    expect(snapshot.isFirst).toBe(false);
    expect(snapshot.isLast).toBe(true);
    expect(snapshot.hasNext).toBe(false);
    expect(snapshot.hasPrev).toBe(true);
  });

  test("a single-step tour is both first and last", async () => {
    const engine = new TourEngine<Ctx>({ tours: [tour([{ id: "only" }])], context });

    await engine.start("onboarding");
    const snapshot = engine.getSnapshot();

    expect(snapshot.isFirst).toBe(true);
    expect(snapshot.isLast).toBe(true);
    expect(snapshot.hasNext).toBe(false);
  });

  test("an idle engine reports no next and no previous", () => {
    const engine = new TourEngine<Ctx>({ tours: [four()], context });

    const snapshot = engine.getSnapshot();

    expect(snapshot.hasNext).toBe(false);
    expect(snapshot.hasPrev).toBe(false);
  });
});
