import { describe, expect, test } from "bun:test";
import { TourEngine } from "./engine";
import type { TourConfig, TourStep } from "./types";

type Ctx = Record<string, never>;

const context: Ctx = {};

function tour(steps: TourStep<Ctx>[]): TourConfig<Ctx> {
  return { id: "onboarding", version: 1, steps };
}

describe("refresh", () => {
  test("the token starts at zero", () => {
    const engine = new TourEngine<Ctx>({ tours: [tour([{ id: "a" }])], context });

    expect(engine.getSnapshot().refreshToken).toBe(0);
  });

  test("refresh bumps the token so a renderer can remeasure", async () => {
    const engine = new TourEngine<Ctx>({ tours: [tour([{ id: "a" }])], context });
    await engine.start("onboarding");

    engine.refresh();

    expect(engine.getSnapshot().refreshToken).toBe(1);
  });

  test("each call bumps it again", async () => {
    const engine = new TourEngine<Ctx>({ tours: [tour([{ id: "a" }])], context });
    await engine.start("onboarding");

    engine.refresh();
    engine.refresh();

    expect(engine.getSnapshot().refreshToken).toBe(2);
  });

  test("refresh notifies subscribers", async () => {
    const engine = new TourEngine<Ctx>({ tours: [tour([{ id: "a" }])], context });
    await engine.start("onboarding");
    let notified = 0;
    engine.subscribe(() => {
      notified += 1;
    });

    engine.refresh();

    expect(notified).toBe(1);
  });

  test("refresh does not change the step", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }])],
      context,
    });
    await engine.start("onboarding");

    engine.refresh();

    expect(engine.getSnapshot().step?.id).toBe("a");
    expect(engine.getSnapshot().status).toBe("active");
  });

  test("refresh on an idle engine is harmless", () => {
    const engine = new TourEngine<Ctx>({ tours: [tour([{ id: "a" }])], context });

    engine.refresh();

    expect(engine.getSnapshot().status).toBe("idle");
    expect(engine.getSnapshot().refreshToken).toBe(1);
  });

  test("the token survives moving between steps", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }])],
      context,
    });
    await engine.start("onboarding");
    engine.refresh();

    await engine.advance();

    expect(engine.getSnapshot().refreshToken).toBe(1);
  });
});
