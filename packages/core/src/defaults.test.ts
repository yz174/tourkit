import { describe, expect, test } from "bun:test";
import { TourEngine } from "./engine";
import { visibleSteps } from "./resolver";
import type { TourConfig } from "./types";

type Ctx = { isHost: boolean };

const context: Ctx = { isHost: false };

describe("defaultStepOptions", () => {
  test("a default fills in a field the step does not set", () => {
    const config: TourConfig<Ctx> = {
      id: "onboarding",
      version: 1,
      defaultStepOptions: { interaction: "passthrough" },
      steps: [{ id: "a" }],
    };

    expect(visibleSteps(config, context)[0]?.interaction).toBe("passthrough");
  });

  test("the step wins over the default", () => {
    const config: TourConfig<Ctx> = {
      id: "onboarding",
      version: 1,
      defaultStepOptions: { interaction: "passthrough" },
      steps: [{ id: "a", interaction: "block" }],
    };

    expect(visibleSteps(config, context)[0]?.interaction).toBe("block");
  });

  test("defaults cover every behaviour field a tour would repeat", () => {
    const config: TourConfig<Ctx> = {
      id: "onboarding",
      version: 1,
      defaultStepOptions: {
        interaction: "passthrough",
        gateTimeoutMs: 10000,
        onGateTimeout: "abort",
        placement: "top",
        align: "end",
        scroll: false,
        padding: 12,
        radius: 999,
      },
      steps: [{ id: "a" }],
    };

    const step = visibleSteps(config, context)[0];

    expect(step?.gateTimeoutMs).toBe(10000);
    expect(step?.onGateTimeout).toBe("abort");
    expect(step?.placement).toBe("top");
    expect(step?.align).toBe("end");
    expect(step?.scroll).toBe(false);
    expect(step?.padding).toBe(12);
    expect(step?.radius).toBe(999);
  });

  test("a step keeps its own id", () => {
    const config: TourConfig<Ctx> = {
      id: "onboarding",
      version: 1,
      defaultStepOptions: { placement: "top" },
      steps: [{ id: "a" }, { id: "b" }],
    };

    expect(visibleSteps(config, context).map((step) => step.id)).toEqual(["a", "b"]);
  });

  test("a when on the step still filters after defaults are applied", () => {
    const config: TourConfig<Ctx> = {
      id: "onboarding",
      version: 1,
      defaultStepOptions: { placement: "top" },
      steps: [{ id: "a" }, { id: "host", when: (ctx) => ctx.isHost }],
    };

    expect(visibleSteps(config, context).map((step) => step.id)).toEqual(["a"]);
  });

  test("a tour with no defaults returns its own step objects unchanged", () => {
    const step = { id: "a" };
    const config: TourConfig<Ctx> = { id: "onboarding", version: 1, steps: [step] };

    expect(visibleSteps(config, context)[0]).toBe(step);
  });

  test("resolved steps keep a stable identity across calls", () => {
    const config: TourConfig<Ctx> = {
      id: "onboarding",
      version: 1,
      defaultStepOptions: { placement: "top" },
      steps: [{ id: "a" }],
    };

    expect(visibleSteps(config, context)[0]).toBe(visibleSteps(config, context)[0]);
  });

  test("the engine applies defaults to the running step", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [
        {
          id: "onboarding",
          version: 1,
          defaultStepOptions: { interaction: "advance-on-press" },
          steps: [{ id: "a" }],
        },
      ],
      context,
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.interaction).toBe("advance-on-press");
  });

  test("a default gateTimeoutMs applies to a step that never sets one", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [
        {
          id: "onboarding",
          version: 1,
          defaultStepOptions: { gateTimeoutMs: 25 },
          steps: [{ id: "a", target: "never-measured" }, { id: "b" }],
        },
      ],
      context,
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.id).toBe("b");
  });
});
