import { describe, expect, test } from "bun:test";
import { TourEngine } from "./engine";
import type { StepInfo, TourConfig, TourStep } from "./types";

type Ctx = Record<string, never>;

const context: Ctx = {};

function tour(steps: TourStep<Ctx>[], extra: Partial<TourConfig<Ctx>> = {}): TourConfig<Ctx> {
  return { id: "onboarding", version: 1, steps, ...extra };
}

describe("what every hook is told about its step", () => {
  test("onEnter receives the index, the total, the step id and the tour id", async () => {
    const captured: { info?: StepInfo } = {};
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          { id: "a" },
          {
            id: "b",
            onEnter: (_ctx, stepInfo) => {
              captured.info = stepInfo;
            },
          },
          { id: "c" },
        ]),
      ],
      context,
    });

    await engine.start("onboarding", { at: 1 });

    expect(captured.info).toEqual({ index: 1, total: 3, stepId: "b", tourId: "onboarding" });
  });

  test("onAdvance is told where it is leaving from", async () => {
    let index = -1;
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          { id: "a" },
          {
            id: "b",
            onAdvance: (_ctx, info) => {
              index = info.index;
            },
          },
          { id: "c" },
        ]),
      ],
      context,
    });
    await engine.start("onboarding", { at: 1 });

    await engine.advance();

    expect(index).toBe(1);
  });

  test("onBeforeAdvance is told where it is", async () => {
    const captured: { info?: StepInfo } = {};
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          {
            id: "only",
            onBeforeAdvance: (_ctx, info) => {
              captured.info = info;
              return false;
            },
          },
        ]),
      ],
      context,
    });
    await engine.start("onboarding");

    await engine.advance();

    expect(captured.info).toEqual({ index: 0, total: 1, stepId: "only", tourId: "onboarding" });
  });

  test("onBeforeBack is told the step it would leave", async () => {
    let index = -1;
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          { id: "a" },
          {
            id: "b",
            onBeforeBack: (_ctx, info) => {
              index = info.index;
              return true;
            },
          },
        ]),
      ],
      context,
    });
    await engine.start("onboarding", { at: 1 });

    await engine.back();

    expect(index).toBe(1);
  });

  test("onBeforeExit is told which step the user was on when they tried to leave", async () => {
    const captured: { info?: StepInfo } = {};
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([{ id: "a" }, { id: "b" }, { id: "c" }], {
          onBeforeExit: (_ctx, info) => {
            captured.info = info;
            return true;
          },
        }),
      ],
      context,
    });
    await engine.start("onboarding", { at: 2 });

    await engine.stop();

    expect(captured.info).toEqual({ index: 2, total: 3, stepId: "c", tourId: "onboarding" });
  });

  test("the total counts visible steps only, matching the progress indicator", async () => {
    let total = -1;
    type HostCtx = { isHost: boolean };
    const engine = new TourEngine<HostCtx>({
      tours: [
        {
          id: "onboarding",
          version: 1,
          steps: [
            {
              id: "a",
              onEnter: (_ctx, info) => {
                total = info.total;
              },
            },
            { id: "hidden", when: (ctx) => ctx.isHost },
            { id: "c" },
          ],
        },
      ],
      context: { isHost: false },
    });

    await engine.start("onboarding");

    expect(total).toBe(2);
  });

  test("the context still arrives as the first argument", async () => {
    let plan = "";
    type PlanCtx = { plan: string };
    const engine = new TourEngine<PlanCtx>({
      tours: [
        {
          id: "onboarding",
          version: 1,
          steps: [
            {
              id: "a",
              onEnter: (ctx) => {
                plan = ctx.plan;
              },
            },
          ],
        },
      ],
      context: { plan: "pro" },
    });

    await engine.start("onboarding");

    expect(plan).toBe("pro");
  });
});
