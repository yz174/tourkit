import { type TourConfig, visibleSteps } from "@tourkit/core";
import { memoryStorage, TourProvider, useTour } from "@tourkit/react";

type Ctx = { plan: "free" | "pro"; reportsLoaded: boolean };

const onboarding: TourConfig<Ctx> = {
  id: "onboarding",
  version: 1,
  steps: [
    { id: "post", target: "post-ride", title: "Post a ride" },
    { id: "billing", target: "billing", when: (context) => context.plan === "pro" },
    { id: "chart", target: "revenue-chart", gate: async ({ context }) => context.reportsLoaded },
  ],
};

// docs/testing.md — level 1: the config, with no renderer

export function billingIsHiddenOnFree(): boolean {
  const steps = visibleSteps<Ctx>(onboarding, { plan: "free", reportsLoaded: true });
  return !steps.some((step) => step.id === "billing");
}

export function stepIdsAreUnique(tour: TourConfig<Ctx>): boolean {
  const ids = tour.steps.map((step) => step.id);
  return new Set(ids).size === ids.length;
}

/** Target ids that no longer appear anywhere in the given source text. */
export function danglingTargets(tours: TourConfig<never>[], source: string): string[] {
  return tours
    .flatMap((tour) => tour.steps)
    .map((step) => step.target)
    .filter((target): target is string => typeof target === "string" && !target.startsWith("."))
    .filter((target) => !source.includes(target));
}

// docs/testing.md — making a missing target fail fast

export const testable: TourConfig<Ctx> = {
  ...onboarding,
  steps: onboarding.steps.map((step) => ({ ...step, gateTimeoutMs: 30 })),
};

// docs/testing.md — level 2: the tour running, in a DOM

function Launcher() {
  const { start } = useTour();
  return (
    <button type="button" onClick={() => start("onboarding")}>
      start
    </button>
  );
}

export function App({ loaded = true }: { loaded?: boolean }) {
  return (
    <TourProvider<Ctx>
      tours={[testable]}
      context={{ plan: "pro", reportsLoaded: loaded }}
      storage={memoryStorage()}
      theme={{ motion: { morph: 0, travel: 0, fade: 0 } }}
    >
      <button type="button" data-tour-id="post-ride">
        Post a ride
      </button>
      <Launcher />
    </TourProvider>
  );
}

export function Instrumented({ seen }: { seen: string[] }) {
  return (
    <TourProvider<Ctx>
      tours={[testable]}
      context={{ plan: "pro", reportsLoaded: true }}
      storage={memoryStorage()}
      onEvent={(name, event) => seen.push(`${name}:${event.stepId ?? "-"}`)}
    >
      <button type="button" data-tour-id="post-ride">
        Post a ride
      </button>
      <Launcher />
    </TourProvider>
  );
}
