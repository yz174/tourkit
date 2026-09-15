import type { TourConfig, TourStep } from "./types";

const resolved = new WeakMap<TourConfig<never>, TourStep<never>[]>();

function withDefaults<Ctx>(config: TourConfig<Ctx>): TourStep<Ctx>[] {
  const defaults = config.defaultStepOptions;
  if (!defaults) return config.steps;

  const key = config as unknown as TourConfig<never>;
  const cached = resolved.get(key) as TourStep<Ctx>[] | undefined;
  if (cached) return cached;

  const merged = config.steps.map((step) => ({ ...defaults, ...step }));
  resolved.set(key, merged as unknown as TourStep<never>[]);
  return merged;
}

export function visibleSteps<Ctx>(config: TourConfig<Ctx>, context: Ctx): TourStep<Ctx>[] {
  return withDefaults(config).filter((step) => (step.when ? step.when(context) : true));
}

export function stepAt<Ctx>(steps: TourStep<Ctx>[], index: number): TourStep<Ctx> | null {
  return steps[index] ?? null;
}

export function indexOfStep<Ctx>(steps: TourStep<Ctx>[], stepId: string): number {
  return steps.findIndex((step) => step.id === stepId);
}
