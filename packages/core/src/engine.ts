import { readRecord, writeRecord } from "./persistence";
import { type Rect, rectsEqual } from "./rect";
import { indexOfStep, stepAt, visibleSteps } from "./resolver";
import { mergeTheme, type Theme, type ThemeOverride } from "./theme";
import type {
  EventHandler,
  NavAdapter,
  StepEventHandler,
  StepEventName,
  StepInfo,
  StorageAdapter,
  TourConfig,
  TourEventName,
  TourStatus,
  TourStep,
} from "./types";

const DEFAULT_GATE_TIMEOUT = 5000;

export type EngineOptions<Ctx> = {
  tours: TourConfig<Ctx>[];
  context: Ctx;
  theme?: ThemeOverride;
  storage?: StorageAdapter;
  nav?: NavAdapter;
  onEvent?: EventHandler;
};

export type StartOptions = { at?: number | string };

export type EngineSnapshot<Ctx> = {
  status: TourStatus;
  tourId: string | null;
  stepIndex: number;
  step: TourStep<Ctx> | null;
  steps: TourStep<Ctx>[];
  total: number;
  activeTarget: string | null;
  rects: Record<string, Rect>;
  theme: Theme;
  dismissible: boolean;
  refreshToken: number;
  isFirst: boolean;
  isLast: boolean;
  hasNext: boolean;
  hasPrev: boolean;
};

export class TourEngine<Ctx = unknown> {
  #options: EngineOptions<Ctx>;
  #status: TourStatus = "idle";
  #tourId: string | null = null;
  #stepIndex = 0;
  #rects: Record<string, Rect> = {};
  #listeners = new Set<() => void>();
  #rectWaiters = new Map<string, Set<() => void>>();
  #runToken = 0;
  #adhoc: TourConfig<Ctx> | null = null;
  #refreshToken = 0;
  #stepListeners = new Map<string, Set<StepEventHandler>>();
  #shownWaiters = new Map<string, Set<(shown: boolean) => void>>();
  #openStepId: string | null = null;
  #snapshot: EngineSnapshot<Ctx>;

  constructor(options: EngineOptions<Ctx>) {
    this.#options = options;
    this.#snapshot = this.#buildSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = (): EngineSnapshot<Ctx> => this.#snapshot;

  setContext(context: Ctx): void {
    this.#options = { ...this.#options, context };
    this.#notify();
  }

  setOptions(patch: Partial<Omit<EngineOptions<Ctx>, "context">>): void {
    this.#options = { ...this.#options, ...patch };
    this.#notify();
  }

  async start(tour: string | TourConfig<Ctx>, options?: StartOptions): Promise<void> {
    const config =
      typeof tour === "string" ? this.#options.tours.find((entry) => entry.id === tour) : tour;
    if (!config) return;

    const token = ++this.#runToken;
    this.#adhoc = typeof tour === "string" ? null : tour;
    this.#tourId = config.id;
    this.#stepIndex = 0;
    this.#status = "resolving";
    this.#notify();

    const steps = this.#visible();
    const record = await readRecord(this.#options.storage, config);
    if (token !== this.#runToken) return;

    let index = 0;
    let resumed = false;
    const requested = resolveStart(steps, options?.at);
    if (requested >= 0) {
      index = requested;
    } else if (record?.outcome === "pending") {
      const found = indexOfStep(steps, record.stepId);
      if (found >= 0) {
        index = found;
        resumed = true;
      }
    }

    this.#emit(resumed ? "tour:resume" : "tour:start", index, steps);
    await this.#enterStep(index);
  }

  async stop(): Promise<void> {
    if (this.#status === "idle") return;
    const steps = this.#visible();
    const step = stepAt(steps, this.#stepIndex);
    const hook = step?.onBeforeExit ?? this.#config()?.onBeforeExit;
    if (!(await this.#allowed(hook, this.#info(this.#stepIndex, steps)))) return;
    await this.#finish("skipped");
  }

  async advance(): Promise<void> {
    if (this.#status !== "active") return;
    const steps = this.#visible();
    const step = stepAt(steps, this.#stepIndex);
    if (!(await this.#allowed(step?.onBeforeAdvance, this.#info(this.#stepIndex, steps)))) return;
    await this.#advanceFrom(this.#stepIndex);
  }

  async back(): Promise<void> {
    if (this.#status !== "active" || this.#stepIndex === 0) return;
    const steps = this.#visible();
    const backHook = stepAt(steps, this.#stepIndex)?.onBeforeBack;
    if (!(await this.#allowed(backHook, this.#info(this.#stepIndex, steps)))) return;
    this.#emit("step:exit", this.#stepIndex, steps);
    await this.#enterStep(this.#stepIndex - 1);
  }

  #info(index: number, steps: TourStep<Ctx>[]): StepInfo {
    return {
      index,
      total: steps.length,
      stepId: stepAt(steps, index)?.id ?? "",
      tourId: this.#tourId ?? "",
    };
  }

  async #allowed(
    hook: ((context: Ctx, info: StepInfo) => boolean | Promise<boolean>) | undefined,
    info: StepInfo,
  ) {
    if (!hook) return true;
    try {
      return (await hook(this.#options.context, info)) !== false;
    } catch {
      return false;
    }
  }

  async moveTo(index: number): Promise<void> {
    if (this.#status !== "active") return;
    const steps = this.#visible();
    if (!stepAt(steps, index) || index === this.#stepIndex) return;
    this.#emit("step:exit", this.#stepIndex, steps);
    await this.#enterStep(index);
  }

  async show(stepId: string): Promise<void> {
    const index = indexOfStep(this.#visible(), stepId);
    if (index < 0) return;
    await this.moveTo(index);
  }

  getById(stepId: string): TourStep<Ctx> | null {
    return this.#visible().find((step) => step.id === stepId) ?? null;
  }

  getNextStep(): TourStep<Ctx> | null {
    return stepAt(this.#visible(), this.#stepIndex + 1);
  }

  getPreviousStep(): TourStep<Ctx> | null {
    return stepAt(this.#visible(), this.#stepIndex - 1);
  }

  async skip(): Promise<void> {
    if (this.#status === "idle") return;
    const steps = this.#visible();
    const index = this.#stepIndex;
    if (!stepAt(steps, index)) return;
    this.#emit("step:exit", index, steps);
    this.#emit("step:skip", index, steps);
    if (index >= steps.length - 1) {
      await this.#finish("completed");
      return;
    }
    await this.#enterStep(index + 1);
  }

  /** Subscribe to one step's own lifecycle. Returns the unsubscribe function. */
  onStep(stepId: string, handler: StepEventHandler): () => void {
    const handlers = this.#stepListeners.get(stepId) ?? new Set<StepEventHandler>();
    handlers.add(handler);
    this.#stepListeners.set(stepId, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.#stepListeners.delete(stepId);
    };
  }

  /** True only while the step is the active one, so a step waiting on its gate is not open. */
  isOpen(stepId: string): boolean {
    return this.#openStepId === stepId;
  }

  /**
   * Resolves true when the step is on screen, false when the run ends without showing it.
   * Never hangs: a skipped step, a finished tour and an unknown id all resolve false.
   */
  whenShown(stepId: string): Promise<boolean> {
    if (this.#openStepId === stepId) return Promise.resolve(true);
    if (this.#status !== "idle" && indexOfStep(this.#visible(), stepId) < 0) {
      return Promise.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      const waiters = this.#shownWaiters.get(stepId) ?? new Set<(shown: boolean) => void>();
      waiters.add(resolve);
      this.#shownWaiters.set(stepId, waiters);
    });
  }

  #emitStep(name: StepEventName, index: number, steps: TourStep<Ctx>[]): void {
    const step = stepAt(steps, index);
    if (!step) return;
    const handlers = this.#stepListeners.get(step.id);
    if (!handlers) return;
    const info = this.#info(index, steps);
    for (const handler of [...handlers]) {
      try {
        handler(name, info);
      } catch {
        // A subscriber's failure is theirs. The tour keeps running.
      }
    }
  }

  /** Closes whatever step is open, so `hide` always pairs with a `show`. */
  #closeOpenStep(): void {
    const stepId = this.#openStepId;
    if (stepId === null) return;
    const steps = this.#visible();
    const index = indexOfStep(steps, stepId);
    this.#openStepId = null;
    if (index < 0) return;
    this.#emitStep("before-hide", index, steps);
    this.#emitStep("hide", index, steps);
  }

  #settleWaiters(stepId: string, shown: boolean): void {
    const waiters = this.#shownWaiters.get(stepId);
    if (!waiters) return;
    this.#shownWaiters.delete(stepId);
    for (const waiter of waiters) waiter(shown);
  }

  #settleAllWaiters(): void {
    const pending = [...this.#shownWaiters.values()];
    this.#shownWaiters.clear();
    for (const waiters of pending) {
      for (const waiter of waiters) waiter(false);
    }
  }

  /** Bumps `refreshToken`, which the renderers watch to remeasure. */
  refresh(): void {
    this.#refreshToken += 1;
    this.#notify();
  }

  setRect(target: string, rect: Rect): void {
    if (rectsEqual(this.#rects[target] ?? null, rect)) return;
    this.#rects = { ...this.#rects, [target]: rect };
    this.#notify();
    const waiters = this.#rectWaiters.get(target);
    if (!waiters) return;
    this.#rectWaiters.delete(target);
    for (const waiter of waiters) waiter();
  }

  clearRect(target: string): void {
    if (!(target in this.#rects)) return;
    const next = { ...this.#rects };
    delete next[target];
    this.#rects = next;
    this.#notify();
  }

  #config(): TourConfig<Ctx> | null {
    if (this.#tourId === null) return null;
    if (this.#adhoc?.id === this.#tourId) return this.#adhoc;
    return this.#options.tours.find((tour) => tour.id === this.#tourId) ?? null;
  }

  #visible(): TourStep<Ctx>[] {
    const config = this.#config();
    return config ? visibleSteps(config, this.#options.context) : [];
  }

  async #enterStep(index: number): Promise<void> {
    const config = this.#config();
    if (!config) return;

    const token = ++this.#runToken;
    const steps = this.#visible();
    const step = stepAt(steps, index);
    if (!step) {
      await this.#finish("completed");
      return;
    }

    this.#closeOpenStep();
    this.#stepIndex = index;
    this.#status = "resolving";
    this.#notify();
    this.#emitStep("before-show", index, steps);

    const nav = this.#options.nav;
    if (step.route && nav && !nav.matches(step.route)) {
      await nav.navigate(step.route);
      if (token !== this.#runToken) return;
    }

    await step.onEnter?.(this.#options.context, this.#info(index, steps));
    if (token !== this.#runToken) return;

    const passed = await this.#runGate(step);
    if (token !== this.#runToken) return;

    if (!passed) {
      await this.#failGate(step, index);
      return;
    }

    this.#status = "active";
    this.#openStepId = step.id;
    this.#notify();
    this.#emitStep("show", index, steps);
    this.#emit("step:enter", index, steps);
    this.#settleWaiters(step.id, true);
    await writeRecord(this.#options.storage, config, {
      outcome: "pending",
      stepId: step.id,
      updatedAt: Date.now(),
    });
  }

  async #runGate(step: TourStep<Ctx>): Promise<boolean> {
    const timeoutMs = step.gateTimeoutMs ?? DEFAULT_GATE_TIMEOUT;
    const gate = step.gate;
    if (gate) {
      return await withTimeout(
        (async () => gate({ context: this.#options.context, step }))(),
        timeoutMs,
      );
    }
    if (!step.target) return true;
    if (this.#rects[step.target]) return true;
    return await withTimeout(this.#waitForRect(step.target), timeoutMs);
  }

  #waitForRect(target: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const waiters = this.#rectWaiters.get(target) ?? new Set<() => void>();
      waiters.add(() => resolve(true));
      this.#rectWaiters.set(target, waiters);
    });
  }

  async #failGate(step: TourStep<Ctx>, index: number): Promise<void> {
    const steps = this.#visible();
    this.#openStepId = null;
    this.#settleWaiters(step.id, false);
    this.#emit("target:timeout", index, steps);

    const policy = step.onGateTimeout ?? "skip";
    if (policy === "abort") {
      await this.#finish("skipped");
      return;
    }
    if (policy === "advance") {
      await this.#advanceFrom(index);
      return;
    }

    this.#emit("step:skip", index, steps);
    if (index >= steps.length - 1) {
      await this.#finish("completed");
      return;
    }
    await this.#enterStep(index + 1);
  }

  async #advanceFrom(index: number): Promise<void> {
    const steps = this.#visible();
    const step = stepAt(steps, index);
    if (!step) return;

    const token = this.#runToken;
    this.#emit("step:exit", index, steps);
    await step.onAdvance?.(this.#options.context, this.#info(index, steps));
    if (token !== this.#runToken) return;

    if (index >= steps.length - 1) {
      await this.#finish("completed");
      return;
    }
    await this.#enterStep(index + 1);
  }

  async #finish(outcome: "completed" | "skipped"): Promise<void> {
    const config = this.#config();
    const steps = this.#visible();
    const stepId = stepAt(steps, this.#stepIndex)?.id ?? "";
    const total = steps.length;

    this.#closeOpenStep();

    this.#runToken++;
    this.#status = "idle";
    this.#tourId = null;
    this.#adhoc = null;
    this.#stepIndex = 0;
    this.#rects = {};
    this.#rectWaiters.clear();
    this.#settleAllWaiters();
    this.#notify();

    if (!config) return;
    await writeRecord(this.#options.storage, config, {
      outcome,
      stepId,
      updatedAt: Date.now(),
    });
    this.#options.onEvent?.(outcome === "completed" ? "tour:complete" : "tour:abort", {
      tourId: config.id,
      stepId: null,
      stepIndex: 0,
      total,
    });
  }

  #emit(name: TourEventName, index: number, steps: TourStep<Ctx>[]): void {
    const tourId = this.#tourId;
    if (tourId === null) return;
    this.#options.onEvent?.(name, {
      tourId,
      stepId: stepAt(steps, index)?.id ?? null,
      stepIndex: index,
      total: steps.length,
    });
  }

  #buildSnapshot(): EngineSnapshot<Ctx> {
    const config = this.#config();
    const steps = this.#visible();
    const step = stepAt(steps, this.#stepIndex);
    return {
      status: this.#status,
      tourId: this.#tourId,
      stepIndex: this.#stepIndex,
      step,
      steps,
      total: steps.length,
      activeTarget: this.#status === "active" ? (step?.target ?? null) : null,
      rects: this.#rects,
      theme: mergeTheme(this.#options.theme, config?.theme, step?.theme),
      dismissible: step?.dismissible ?? config?.dismissible ?? true,
      refreshToken: this.#refreshToken,
      isFirst: this.#stepIndex === 0,
      isLast: steps.length > 0 && this.#stepIndex >= steps.length - 1,
      hasNext: this.#stepIndex < steps.length - 1,
      hasPrev: this.#stepIndex > 0,
    };
  }

  #notify(): void {
    this.#snapshot = this.#buildSnapshot();
    for (const listener of this.#listeners) listener();
  }
}

function resolveStart<Ctx>(steps: TourStep<Ctx>[], at: number | string | undefined): number {
  if (at === undefined) return -1;
  const index = typeof at === "number" ? at : indexOfStep(steps, at);
  return stepAt(steps, index) ? index : -1;
}

function withTimeout(promise: Promise<boolean>, timeoutMs: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
  });
}
