import type { TourConfig, TourStep } from "./types";

export function visibleSteps<Ctx>(config: TourConfig<Ctx>, context: Ctx): TourStep<Ctx>[] {
  return config.steps.filter((step) => (step.when ? step.when(context) : true));
}

export function stepAt<Ctx>(steps: TourStep<Ctx>[], index: number): TourStep<Ctx> | null {
  return steps[index] ?? null;
}

export function indexOfStep<Ctx>(steps: TourStep<Ctx>[], stepId: string): number {
  return steps.findIndex((step) => step.id === stepId);
}
