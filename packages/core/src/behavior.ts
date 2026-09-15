import type { TourConfig, TourStep } from "./types";

/**
 * Step fields keyed by step id. Every field of a step is allowed except `id`, which is the key.
 */
export type BehaviorOverrides<Ctx> = Partial<Record<string, Partial<Omit<TourStep<Ctx>, "id">>>>;

export type WithBehaviorResult<Ctx> = {
  config: TourConfig<Ctx>;
  /** Override keys that matched no step in the config. */
  unmatched: string[];
};

function mergeStep<Ctx>(step: TourStep<Ctx>, overrides: BehaviorOverrides<Ctx>): TourStep<Ctx> {
  const patch = overrides[step.id];
  if (!patch) return step;
  // Shallow on purpose. A behaviour override replaces a field outright; merging `buttons` or
  // `theme` field by field would make it impossible to clear one from the hand-written file.
  return { ...step, ...patch, id: step.id };
}

/**
 * Merges function-valued step fields into a config that came from JSON.
 *
 * `when`, `gate`, `onEnter` and `onAdvance` are functions, so a `.tour.json` cannot carry them and
 * the emitter never writes them. They live in a hand-written module instead, keyed by step id:
 *
 * ```ts
 * export const onboarding = withBehavior(driverOnboarding, {
 *   billing: { when: (context) => context.plan === "pro" },
 *   history: { gate: waitForFilter, gateTimeoutMs: 3000 },
 * });
 * ```
 *
 * An override naming a step that does not exist is dropped rather than added as a new step: a
 * config's step order is the tour, and an override cannot know where a new step belongs. Use
 * `withBehaviorReport` when a renamed step id should be caught rather than silently ignored.
 */
export function withBehavior<Ctx = unknown>(
  config: TourConfig<Ctx>,
  overrides: BehaviorOverrides<Ctx>,
): TourConfig<Ctx> {
  return withBehaviorReport(config, overrides).config;
}

/** `withBehavior`, plus the override keys that matched nothing. */
export function withBehaviorReport<Ctx = unknown>(
  config: TourConfig<Ctx>,
  overrides: BehaviorOverrides<Ctx>,
): WithBehaviorResult<Ctx> {
  const ids = new Set(config.steps.map((step) => step.id));
  const unmatched = Object.keys(overrides).filter(
    (id) => overrides[id] !== undefined && !ids.has(id),
  );

  return {
    config: { ...config, steps: config.steps.map((step) => mergeStep(step, overrides)) },
    unmatched,
  };
}
