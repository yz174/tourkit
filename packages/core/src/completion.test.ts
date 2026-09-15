import { describe, expect, test } from "bun:test";
import { TourEngine } from "./engine";
import type { TourConfig, TourEventName, TourStep } from "./types";

type Ctx = { ready: boolean };

const context: Ctx = { ready: false };

function tour(steps: TourStep<Ctx>[], extra: Partial<TourConfig<Ctx>> = {}): TourConfig<Ctx> {
  return { id: "onboarding", version: 1, steps, ...extra };
}

/**
 * driver.js has `onDoneClick`: a hook that replaces `onNextClick` on the last step, tells you the
 * user finished, and suppresses the automatic teardown so you own it. These pin the two halves
 * of that on the pieces tourkit already has, so nobody builds a third mechanism for it.
 */
describe("finishing a tour", () => {
  test("completing the last step is reported as tour:complete, not tour:abort", async () => {
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }])],
      context,
      onEvent: (name) => seen.push(name),
    });
    await engine.start("onboarding");

    await engine.advance();
    await engine.advance();

    expect(seen).toContain("tour:complete");
    expect(seen).not.toContain("tour:abort");
  });

  test("leaving early is reported as tour:abort instead", async () => {
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }])],
      context,
      onEvent: (name) => seen.push(name),
    });
    await engine.start("onboarding");

    await engine.stop();

    expect(seen).toContain("tour:abort");
    expect(seen).not.toContain("tour:complete");
  });

  test("the last step can refuse to finish, so teardown is yours to trigger", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "last", onBeforeAdvance: ({ ready }) => ready }])],
      context,
    });
    await engine.start("onboarding", { at: 1 });

    await engine.advance();
    expect(engine.getSnapshot().status).toBe("active");

    engine.setContext({ ready: true });
    await engine.advance();

    expect(engine.getSnapshot().status).toBe("idle");
  });

  test("the last step's onAdvance runs before the tour ends", async () => {
    const order: string[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([{ id: "only", onAdvance: () => void order.push("onAdvance") }]),
        // eslint-disable-next-line
      ],
      context,
      onEvent: (name) => order.push(name),
    });
    await engine.start("onboarding");

    await engine.advance();

    expect(order.indexOf("onAdvance")).toBeLessThan(order.indexOf("tour:complete"));
  });
});

/**
 * driver.js sets each hook on the driver or on one step. tourkit's hooks have always been
 * per-step; `defaultStepOptions` supplies the tour-level half. This pins that combination.
 */
describe("tour-level hooks with a step-level override", () => {
  test("a hook on defaultStepOptions runs for a step that does not define one", async () => {
    const ran: string[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([{ id: "a" }, { id: "b" }], {
          defaultStepOptions: { onEnter: () => void ran.push("default") },
        }),
      ],
      context,
    });

    await engine.start("onboarding");

    expect(ran).toEqual(["default"]);
  });

  test("a step's own hook replaces the tour-level one", async () => {
    const ran: string[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([{ id: "a", onEnter: () => void ran.push("step") }], {
          defaultStepOptions: { onEnter: () => void ran.push("default") },
        }),
      ],
      context,
    });

    await engine.start("onboarding");

    expect(ran).toEqual(["step"]);
  });

  test("a veto on defaultStepOptions applies to every step", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([{ id: "a" }, { id: "b" }], {
          defaultStepOptions: { onBeforeAdvance: () => false },
        }),
      ],
      context,
    });
    await engine.start("onboarding");

    await engine.advance();

    expect(engine.getSnapshot().step?.id).toBe("a");
  });
});
