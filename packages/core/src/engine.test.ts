import { beforeEach, describe, expect, test } from "bun:test";
import { TourEngine } from "./engine";
import type { StorageAdapter, TourConfig, TourEventName, TourStep } from "./types";

type Ctx = { isHost: boolean };

const context: Ctx = { isHost: false };

function memoryStorage(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  const adapter: StorageAdapter = {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async remove(key) {
      store.delete(key);
    },
  };
  return { adapter, store };
}

function tour(steps: TourStep<Ctx>[], version = 1): TourConfig<Ctx> {
  return { id: "onboarding", version, steps };
}

describe("visible steps", () => {
  test("when filters a step out and total counts only visible steps", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          { id: "a" },
          { id: "host-only", when: (ctx) => ctx.isHost },
          { id: "b" },
          { id: "c" },
        ]),
      ],
      context,
    });

    await engine.start("onboarding");
    const snapshot = engine.getSnapshot();

    expect(snapshot.steps.map((step) => step.id)).toEqual(["a", "b", "c"]);
    expect(snapshot.total).toBe(3);
    expect(snapshot.step?.id).toBe("a");
  });

  test("setContext re-filters the visible list", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "host-only", when: (ctx) => ctx.isHost }])],
      context,
    });

    await engine.start("onboarding");
    expect(engine.getSnapshot().total).toBe(1);

    engine.setContext({ isHost: true });
    expect(engine.getSnapshot().total).toBe(2);
  });
});

describe("gates", () => {
  test("a gate resolving true activates the step", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", gate: () => true }])],
      context,
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().status).toBe("active");
    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("a gate resolving false applies the timeout policy", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", gate: async () => false }, { id: "b" }])],
      context,
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("a gate that never settles times out and emits target:timeout", async () => {
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          { id: "a", gate: () => new Promise<boolean>(() => {}), gateTimeoutMs: 10 },
          { id: "b" },
        ]),
      ],
      context,
      onEvent: (name) => seen.push(name),
    });

    await engine.start("onboarding");

    expect(seen).toContain("target:timeout");
    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("a gate that throws is treated as failure", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          {
            id: "a",
            gate: () => {
              throw new Error("boom");
            },
          },
          { id: "b" },
        ]),
      ],
      context,
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("the default gate waits for a rect and activates when one arrives", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", target: "cta", gateTimeoutMs: 500 }])],
      context,
    });

    const started = engine.start("onboarding");
    expect(engine.getSnapshot().status).toBe("resolving");

    engine.setRect("cta", { x: 0, y: 0, width: 10, height: 10 });
    await started;

    expect(engine.getSnapshot().status).toBe("active");
    expect(engine.getSnapshot().activeTarget).toBe("cta");
  });

  test("a step with no target passes the default gate immediately", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", target: null }])],
      context,
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().status).toBe("active");
    expect(engine.getSnapshot().activeTarget).toBe(null);
  });
});

describe("gate timeout policies", () => {
  test("skip is the default and never runs onAdvance", async () => {
    let advanced = 0;
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          {
            id: "a",
            target: "missing",
            gateTimeoutMs: 10,
            onAdvance: () => {
              advanced += 1;
            },
          },
          { id: "b" },
        ]),
      ],
      context,
    });

    await engine.start("onboarding");

    expect(advanced).toBe(0);
    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("skip emits step:skip and not step:exit", async () => {
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", target: "missing", gateTimeoutMs: 10 }, { id: "b" }])],
      context,
      onEvent: (name) => seen.push(name),
    });

    await engine.start("onboarding");

    expect(seen).toContain("step:skip");
    expect(seen).not.toContain("step:exit");
  });

  test("skip on the last step completes the tour", async () => {
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "only", target: "missing", gateTimeoutMs: 10 }])],
      context,
      onEvent: (name) => seen.push(name),
    });

    await engine.start("onboarding");

    expect(seen).toContain("tour:complete");
    expect(engine.getSnapshot().status).toBe("idle");
  });

  test("advance runs onAdvance and moves on", async () => {
    let advanced = 0;
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          {
            id: "a",
            target: "missing",
            gateTimeoutMs: 10,
            onGateTimeout: "advance",
            onAdvance: () => {
              advanced += 1;
            },
          },
          { id: "b" },
        ]),
      ],
      context,
    });

    await engine.start("onboarding");

    expect(advanced).toBe(1);
    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("abort stops the tour and records it as skipped", async () => {
    const { adapter, store } = memoryStorage();
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          { id: "a", target: "missing", gateTimeoutMs: 10, onGateTimeout: "abort" },
          { id: "b" },
        ]),
      ],
      context,
      storage: adapter,
      onEvent: (name) => seen.push(name),
    });

    await engine.start("onboarding");

    expect(seen).toContain("tour:abort");
    expect(engine.getSnapshot().status).toBe("idle");
    expect(JSON.parse(store.get("tour:onboarding:v1") ?? "{}").outcome).toBe("skipped");
  });
});

describe("advancing", () => {
  test("onAdvance resolves before the step index changes", async () => {
    const indexDuringAdvance: number[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          {
            id: "a",
            onAdvance: async () => {
              indexDuringAdvance.push(engine.getSnapshot().stepIndex);
              await Promise.resolve();
              indexDuringAdvance.push(engine.getSnapshot().stepIndex);
            },
          },
          { id: "b" },
        ]),
      ],
      context,
    });

    await engine.start("onboarding");
    await engine.advance();

    expect(indexDuringAdvance).toEqual([0, 0]);
    expect(engine.getSnapshot().stepIndex).toBe(1);
    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("step:exit is emitted before step:enter", async () => {
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }])],
      context,
      onEvent: (name) => seen.push(name),
    });

    await engine.start("onboarding");
    await engine.advance();

    expect(seen).toEqual(["tour:start", "step:enter", "step:exit", "step:enter"]);
  });

  test("advancing past the last step completes the tour", async () => {
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }])],
      context,
      onEvent: (name) => seen.push(name),
    });

    await engine.start("onboarding");
    await engine.advance();

    expect(seen).toContain("tour:complete");
    expect(engine.getSnapshot().status).toBe("idle");
  });

  test("advance is ignored while a step is still resolving", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", target: "cta", gateTimeoutMs: 500 }, { id: "b" }])],
      context,
    });

    const started = engine.start("onboarding");
    await engine.advance();
    expect(engine.getSnapshot().stepIndex).toBe(0);

    engine.setRect("cta", { x: 0, y: 0, width: 1, height: 1 });
    await started;
    expect(engine.getSnapshot().status).toBe("active");
  });

  test("back returns to the previous step", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }])],
      context,
    });

    await engine.start("onboarding");
    await engine.advance();
    await engine.back();

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("back on the first step does nothing", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }])],
      context,
    });

    await engine.start("onboarding");
    await engine.back();

    expect(engine.getSnapshot().stepIndex).toBe(0);
    expect(engine.getSnapshot().status).toBe("active");
  });
});

describe("stopping", () => {
  test("stop clears every cached rect", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [
        tour([
          { id: "a", target: "cta" },
          { id: "b", target: "other" },
        ]),
      ],
      context,
    });

    const started = engine.start("onboarding");
    engine.setRect("cta", { x: 0, y: 0, width: 1, height: 1 });
    engine.setRect("other", { x: 5, y: 5, width: 2, height: 2 });
    await started;
    expect(Object.keys(engine.getSnapshot().rects)).toHaveLength(2);

    await engine.stop();

    expect(engine.getSnapshot().rects).toEqual({});
    expect(engine.getSnapshot().status).toBe("idle");
    expect(engine.getSnapshot().tourId).toBe(null);
  });

  test("stopping mid-gate prevents the step from activating later", async () => {
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", target: "cta", gateTimeoutMs: 20 }])],
      context,
    });

    const started = engine.start("onboarding");
    await engine.stop();
    engine.setRect("cta", { x: 0, y: 0, width: 1, height: 1 });
    await started;

    expect(engine.getSnapshot().status).toBe("idle");
  });
});

describe("resume", () => {
  test("a pending record at a matching version resumes on that step", async () => {
    const { adapter } = memoryStorage({
      "tour:onboarding:v1": JSON.stringify({
        outcome: "pending",
        stepId: "c",
        updatedAt: 1,
      }),
    });
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }, { id: "c" }])],
      context,
      storage: adapter,
      onEvent: (name) => seen.push(name),
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.id).toBe("c");
    expect(seen[0]).toBe("tour:resume");
  });

  test("a record written at another version is ignored", async () => {
    const { adapter } = memoryStorage({
      "tour:onboarding:v1": JSON.stringify({
        outcome: "pending",
        stepId: "c",
        updatedAt: 1,
      }),
    });
    const seen: TourEventName[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }, { id: "c" }], 2)],
      context,
      storage: adapter,
      onEvent: (name) => seen.push(name),
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.id).toBe("a");
    expect(seen[0]).toBe("tour:start");
  });

  test("a completed record starts from the beginning", async () => {
    const { adapter } = memoryStorage({
      "tour:onboarding:v1": JSON.stringify({
        outcome: "completed",
        stepId: "c",
        updatedAt: 1,
      }),
    });
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b" }, { id: "c" }])],
      context,
      storage: adapter,
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("a pending record naming a step that no longer resolves starts from the beginning", async () => {
    const { adapter } = memoryStorage({
      "tour:onboarding:v1": JSON.stringify({
        outcome: "pending",
        stepId: "host-only",
        updatedAt: 1,
      }),
    });
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "host-only", when: (ctx) => ctx.isHost }])],
      context,
      storage: adapter,
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.id).toBe("a");
  });

  test("corrupt stored json is ignored", async () => {
    const { adapter } = memoryStorage({ "tour:onboarding:v1": "{not json" });
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }])],
      context,
      storage: adapter,
    });

    await engine.start("onboarding");

    expect(engine.getSnapshot().step?.id).toBe("a");
  });
});

describe("routing", () => {
  test("a step off-route navigates before the gate runs", async () => {
    const visited: string[] = [];
    let route = "/home";
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a" }, { id: "b", route: "/inbox" }])],
      context,
      nav: {
        getRoute: () => route,
        matches: (candidate) => candidate === route,
        navigate: (candidate) => {
          visited.push(candidate);
          route = candidate;
        },
      },
    });

    await engine.start("onboarding");
    await engine.advance();

    expect(visited).toEqual(["/inbox"]);
    expect(engine.getSnapshot().step?.id).toBe("b");
  });

  test("a step already on-route does not navigate", async () => {
    const visited: string[] = [];
    const engine = new TourEngine<Ctx>({
      tours: [tour([{ id: "a", route: "/home" }])],
      context,
      nav: {
        getRoute: () => "/home",
        matches: (candidate) => candidate === "/home",
        navigate: (candidate) => {
          visited.push(candidate);
        },
      },
    });

    await engine.start("onboarding");

    expect(visited).toEqual([]);
  });
});

describe("subscriptions", () => {
  let engine: TourEngine<Ctx>;

  beforeEach(() => {
    engine = new TourEngine<Ctx>({ tours: [tour([{ id: "a" }, { id: "b" }])], context });
  });

  test("the snapshot is referentially stable between notifications", () => {
    expect(engine.getSnapshot()).toBe(engine.getSnapshot());
  });

  test("subscribers fire on change and stop after unsubscribe", async () => {
    let calls = 0;
    const unsubscribe = engine.subscribe(() => {
      calls += 1;
    });

    await engine.start("onboarding");
    expect(calls).toBeGreaterThan(0);

    const seen = calls;
    unsubscribe();
    await engine.advance();
    expect(calls).toBe(seen);
  });

  test("a no-op rect write does not notify", async () => {
    await engine.start("onboarding");
    let calls = 0;
    engine.subscribe(() => {
      calls += 1;
    });

    engine.setRect("cta", { x: 0, y: 0, width: 10, height: 10 });
    expect(calls).toBe(1);

    engine.setRect("cta", { x: 0.4, y: 0, width: 10, height: 10 });
    expect(calls).toBe(1);
  });
});

describe("unknown tours", () => {
  test("starting a tour that does not exist changes nothing", async () => {
    const engine = new TourEngine<Ctx>({ tours: [tour([{ id: "a" }])], context });

    await engine.start("nope");

    expect(engine.getSnapshot().status).toBe("idle");
    expect(engine.getSnapshot().tourId).toBe(null);
  });
});
