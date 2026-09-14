import { describe, expect, test } from "bun:test";
import { TourEngine } from "./engine";
import type { TourConfig, TourStep } from "./types";

type Ctx = { confirmed: boolean };

const context: Ctx = { confirmed: false };

function tour(steps: TourStep<Ctx>[], extra: Partial<TourConfig<Ctx>> = {}): TourConfig<Ctx> {
  return { id: "onboarding", version: 1, steps, ...extra };
}

describe("onBeforeAdvance", () => {
  test("returning false keeps the tour on the same step", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", onBeforeAdvance: () => false }, { id: "b" }])],
      context,
    });
    await engine.start("onboarding");

    await engine.advance();

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("returning true advances", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", onBeforeAdvance: () => true }, { id: "b" }])],
      context,
    });
    await engine.start("onboarding");

    await engine.advance();

    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("an async veto is awaited", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", onBeforeAdvance: async () => false }, { id: "b" }])],
      context,
    });
    await engine.start("onboarding");

    await engine.advance();

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("a veto reads the live context", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", onBeforeAdvance: (ctx) => ctx.confirmed }, { id: "b" }])],
      context,
    });
    await engine.start("onboarding");

    await engine.advance();
    expect(engine.getSnapshot().step?.id).toBe("a");

    engine.setContext({ confirmed: true });
    await engine.advance();

    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("a veto stops onAdvance from running", async () => {
    let ran = false;
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          {
            id: "a",
            onBeforeAdvance: () => false,
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

    await engine.advance();

    expect(ran).toBe(false);
  });

  test("a veto emits no step:exit", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", onBeforeAdvance: () => false }, { id: "b" }])],
      context,
      onEvent: (name) => seen.push(name),
    });
    await engine.start("onboarding");
    seen.length = 0;

    await engine.advance();

    expect(seen).toEqual([]);
  });

  test("a veto on the last step stops the tour completing", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "only", onBeforeAdvance: () => false }])],
      context,
    });
    await engine.start("onboarding");

    await engine.advance();

    expect(engine.getSnapshot().status).toBe("active");
  });

  test("a hook that throws does not advance", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          {
            id: "a",
            onBeforeAdvance: () => {
              throw new Error("boom");
            },
          },
          { id: "b" },
        ]),
      ],
      context,
    });
    await engine.start("onboarding");

    await engine.advance();

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("skip is not blocked by a veto", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", onBeforeAdvance: () => false }, { id: "b" }])],
      context,
    });
    await engine.start("onboarding");

    await engine.skip();

    expect(engine.getSnapshot().step?.id).toBe("b");
  });
});

describe("onBeforeBack", () => {
  test("returning false keeps the tour on the same step", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b", onBeforeBack: () => false }])],
      context,
    });
    await engine.start("onboarding", { at: 1 });

    await engine.back();

    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("returning true goes back", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b", onBeforeBack: () => true }])],
      context,
    });
    await engine.start("onboarding", { at: 1 });

    await engine.back();

    expect(engine.getSnapshot().step?.id).toBe("a");
  });
});

describe("onBeforeExit", () => {
  test("returning false keeps the tour running", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }], { onBeforeExit: () => false })],
      context,
    });
    await engine.start("onboarding");

    await engine.stop();

    expect(engine.getSnapshot().status).toBe("active");
    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("returning true ends the tour", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }], { onBeforeExit: () => true })],
      context,
    });
    await engine.start("onboarding");

    await engine.stop();

    expect(engine.getSnapshot().status).toBe("idle");
  });

  test("an async confirm is awaited", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }], { onBeforeExit: async () => false })],
      context,
    });
    await engine.start("onboarding");

    await engine.stop();

    expect(engine.getSnapshot().status).toBe("active");
  });

  test("a blocked exit emits no tour:abort", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }], { onBeforeExit: () => false })],
      context,
      onEvent: (name) => seen.push(name),
    });
    await engine.start("onboarding");
    seen.length = 0;

    await engine.stop();

    expect(seen).toEqual([]);
  });

  test("a step-level onBeforeExit overrides the tour-level one", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", onBeforeExit: () => true }], { onBeforeExit: () => false })],
      context,
    });
    await engine.start("onboarding");

    await engine.stop();

    expect(engine.getSnapshot().status).toBe("idle");
  });

  test("reaching the end of the tour is not an exit and is never blocked", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "only" }], { onBeforeExit: () => false })],
      context,
    });
    await engine.start("onboarding");

    await engine.advance();

    expect(engine.getSnapshot().status).toBe("idle");
  });
});
