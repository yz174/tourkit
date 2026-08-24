import {
  clearRecord,
  contrastRatio,
  indexOfStep,
  isDark,
  luminance,
  mergeTheme,
  routeMatches,
  stepAt,
  type TourConfig,
  visibleSteps,
} from "@tourkit/core";
import {
  type CardProps,
  holeClipPath,
  holePathData,
  memoryStorage,
  nextFocusTarget,
  TourHint,
  TourProvider,
  TourRecorder,
  useTourContext,
  useTourSelector,
} from "@tourkit/react";
import { type ReactNode, useCallback } from "react";

type Ctx = { plan: "free" | "pro" };

const tour: TourConfig<Ctx> = {
  id: "onboarding",
  version: 1,
  steps: [
    { id: "post", target: "post-ride", title: "Post a ride" },
    { id: "billing", target: "billing", when: (context) => context.plan === "pro" },
  ],
};

// docs/api.md — core: step resolution, persistence, contrast, nav, theme

export function coreSurface() {
  const steps = visibleSteps<Ctx>(tour, { plan: "pro" });
  return {
    steps,
    first: stepAt(steps, 0),
    index: indexOfStep(steps, "billing"),
    ratio: contrastRatio("#111827", "#FBFCFE"),
    lum: luminance("#1E9CFE"),
    dark: isDark("#0B121E"),
    matches: routeMatches("/inbox?page=2", "/inbox", "exact"),
    theme: mergeTheme({ accent: "#ff0066" }, { scrim: { opacity: 0.7 } }),
  };
}

export async function forget() {
  await clearRecord(memoryStorage(), tour);
}

// docs/api.md — react: DOM helpers

export function geometry() {
  return {
    path: holePathData(1440, 900, 100, 200, 120, 44, 12),
    clip: holeClipPath(1440, 900, 100, 200, 120, 44, 12),
  };
}

export function trapFocus(card: HTMLElement) {
  return nextFocusTarget(card, document.activeElement, false);
}

// docs/api.md — useTourSelector wants a stable selector

export function StepCounter() {
  const select = useCallback(
    (snapshot: { stepIndex: number; total: number }) =>
      `${snapshot.stepIndex + 1}/${snapshot.total}`,
    [],
  );
  return <span>{useTourSelector(select)}</span>;
}

// docs/troubleshooting.md — clearing a dismissed hint through the provider's own adapter

export function ResetHint({ id }: { id: string }) {
  const { storage } = useTourContext();
  return (
    <button type="button" onClick={() => void storage.remove(`tourkit:hint:${id}`)}>
      Show the hint again
    </button>
  );
}

// docs/accessibility.md — a custom card keeps its own accessible names and a Back control

export function AccessibleCard({ step, isFirst, isLast, prev, next }: CardProps) {
  return (
    <div>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      {!isFirst ? (
        <button type="button" onClick={prev}>
          Back
        </button>
      ) : null}
      <button type="button" onClick={next} aria-label={isLast ? "Finish the tour" : "Next step"}>
        {isLast ? "Done" : "Next"}
      </button>
    </div>
  );
}

// docs/hints.md and docs/recorder.md, mounted the way the pages show

export function Shell({ children }: { children: ReactNode }) {
  return (
    <TourProvider<Ctx>
      tours={[tour]}
      context={{ plan: "pro" }}
      storage={memoryStorage()}
      components={{ Card: AccessibleCard }}
    >
      {children}
      <TourHint
        id="filters"
        target="filters"
        title="Filter by route"
        body="Narrow rides to the ones passing your gate."
        theme={{ accent: "#ff0066" }}
      />
      <TourRecorder name="Driver onboarding" />
    </TourProvider>
  );
}
