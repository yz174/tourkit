import { describe, expect, test } from "bun:test";
import { TourEngine } from "./engine";
import type { TourConfig, TourStep } from "./types";

type Ctx = Record<string, never>;

const context: Ctx = {};

function tour(steps: TourStep<Ctx>[]): TourConfig<Ctx> {
  return { id: "onboarding", version: 1, steps };
}

const three = () => tour([{ id: "a" }, { id: "b" }, { id: "c" }]);

describe("subscribing to one step", () => {
  test("a subscriber hears its own step opening", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    engine.onStep("a", (name) => seen.push(name));

    await engine.start("onboarding");

    expect(seen).toEqual(["before-show", "show"]);
  });

  test("before-show comes before show", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    engine.onStep("a", (name) => seen.push(name));

    await engine.start("onboarding");

    expect(seen.indexOf("before-show")).toBeLessThan(seen.indexOf("show"));
  });

  test("a subscriber hears its own step closing", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    await engine.start("onboarding");
    engine.onStep("a", (name) => seen.push(name));

    await engine.advance();

    expect(seen).toEqual(["before-hide", "hide"]);
  });

  test("a subscriber hears nothing about other steps", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    engine.onStep("c", (name) => seen.push(name));

    await engine.start("onboarding");
    await engine.advance();

    expect(seen).toEqual([]);
  });

  test("the handler is told which step it is about", async () => {
    let stepId = "";
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    engine.onStep("b", (_name, info) => {
      stepId = info.stepId;
    });

    await engine.start("onboarding", { at: 1 });

    expect(stepId).toBe("b");
  });

  test("unsubscribing stops the events", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    const off = engine.onStep("a", (name) => seen.push(name));
    off();

    await engine.start("onboarding");

    expect(seen).toEqual([]);
  });

  test("two subscribers on one step both hear it", async () => {
    let first = 0;
    let second = 0;
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    engine.onStep("a", () => {
      first += 1;
    });
    engine.onStep("a", () => {
      second += 1;
    });

    await engine.start("onboarding");

    expect(first).toBe(2);
    expect(second).toBe(2);
  });

  test("a handler that throws does not stop the tour", async () => {
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    engine.onStep("a", () => {
      throw new Error("boom");
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.id).toBe("a");
    expect(engine.getSnapshot().status).toBe("active");
  });

  test("a step shown again fires its open events again", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    engine.onStep("a", (name) => seen.push(name));
    await engine.start("onboarding");

    await engine.advance();
    await engine.back();

    expect(seen).toEqual(["before-show", "show", "before-hide", "hide", "before-show", "show"]);
  });

  test("ending the tour closes the open step", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    await engine.start("onboarding");
    engine.onStep("a", (name) => seen.push(name));

    await engine.stop();

    expect(seen).toEqual(["before-hide", "hide"]);
  });

  test("finishing the last step closes it too", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({ tours: [tour([{ id: "only" }])], context });
    await engine.start("onboarding");
    engine.onStep("only", (name) => seen.push(name));

    await engine.advance();

    expect(seen).toEqual(["before-hide", "hide"]);
  });

  test("a skipped step does not report as shown", async () => {
    const seen: string[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", target: "never-measured", gateTimeoutMs: 20 }, { id: "b" }])],
      context,
    });
    engine.onStep("a", (name) => seen.push(name));

    await engine.start("onboarding");

    expect(seen).not.toContain("show");
  });
});

describe("asking whether a step is open", () => {
  test("the active step is open", async () => {
    const engine = new TourEngine<Ctx>({ tours: [three()], context });

    await engine.start("onboarding");

    expect(engine.isOpen("a")).toBe(true);
  });

  test("a step that is not active is not open", async () => {
    const engine = new TourEngine<Ctx>({ tours: [three()], context });

    await engine.start("onboarding");

    expect(engine.isOpen("b")).toBe(false);
  });

  test("nothing is open before the tour starts", () => {
    const engine = new TourEngine<Ctx>({ tours: [three()], context });

    expect(engine.isOpen("a")).toBe(false);
  });

  test("nothing is open after the tour ends", async () => {
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    await engine.start("onboarding");

    await engine.stop();

    expect(engine.isOpen("a")).toBe(false);
  });

  test("a step waiting on its gate is not open yet", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", target: "slow", gateTimeoutMs: 200 }])],
      context,
    });
    const started = engine.start("onboarding");

    expect(engine.isOpen("a")).toBe(false);

    engine.setRect("slow", { x: 0, y: 0, width: 10, height: 10 });
    await started;

    expect(engine.isOpen("a")).toBe(true);
  });
});

describe("waiting until a step is on screen", () => {
  test("start resolves only once the step is active", async () => {
    const engine = new TourEngine<Ctx>({ tours: [three()], context });

    await engine.start("onboarding");

    expect(engine.getSnapshot().status).toBe("active");
  });

  test("whenShown resolves for the step that is already open", async () => {
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    await engine.start("onboarding");

    await engine.whenShown("a");

    expect(engine.isOpen("a")).toBe(true);
  });

  test("whenShown waits for a step that has not opened yet", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", target: "slow", gateTimeoutMs: 500 }])],
      context,
    });
    let resolved = false;
    const waiting = engine.whenShown("a").then(() => {
      resolved = true;
    });

    void engine.start("onboarding");
    expect(resolved).toBe(false);

    engine.setRect("slow", { x: 0, y: 0, width: 10, height: 10 });
    await waiting;

    expect(resolved).toBe(true);
  });

  test("whenShown for a step that is skipped resolves false rather than hanging", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", target: "never", gateTimeoutMs: 20 }, { id: "b" }])],
      context,
    });

    const shown = engine.whenShown("a");
    await engine.start("onboarding");

    expect(await shown).toBe(false);
  });

  test("whenShown resolves true when the step does open", async () => {
    const engine = new TourEngine<Ctx>({ tours: [three()], context });

    const shown = engine.whenShown("b");
    await engine.start("onboarding");
    await engine.advance();

    expect(await shown).toBe(true);
  });

  test("whenShown for an unknown step resolves false", async () => {
    const engine = new TourEngine<Ctx>({ tours: [three()], context });
    await engine.start("onboarding");

    expect(await engine.whenShown("nope")).toBe(false);
  });
});
