import { createNavAdapter, type TourConfig } from "@tourkit/core";
import { type CardProps, TourProvider, useTour, useTourState, useTourTarget } from "@tourkit/react";
import { TourProvider as UnstyledProvider } from "@tourkit/react/unstyled";
import { useMemo } from "react";

export type AppContext = { plan: "free" | "pro"; reportsLoaded: boolean; hasFiltered: boolean };

export const onboarding: TourConfig<AppContext> = {
  id: "onboarding",
  version: 1,
  theme: { scrim: { opacity: 0.7 } },
  steps: [
    { id: "post", target: "post-ride", title: "Post a ride", body: "Offer a seat here." },
    { id: "inbox", target: "inbox", route: "/inbox", title: "Messages" },
    { id: "billing", target: "billing", when: (context) => context.plan === "pro" },
    {
      id: "chart",
      target: "revenue-chart",
      gate: async ({ context }) => context.reportsLoaded,
      gateTimeoutMs: 10000,
      onGateTimeout: "skip",
    },
    {
      id: "try-filter",
      target: "filter",
      interaction: "passthrough",
      gate: ({ context }) => context.hasFiltered,
      gateTimeoutMs: 30000,
    },
    { id: "fab", target: "fab", radius: 999, padding: 12 },
    { id: "row", target: "third-row", scroll: { block: "start" } },
    { id: "fixed", target: "header", scroll: false },
    { id: "done", target: null, title: "That is the tour" },
  ],
};

export function Card({ step, index, total, next, isLast }: CardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-lg">
      <h3 className="font-semibold">{step.title}</h3>
      <p className="text-sm text-gray-500">{step.body}</p>
      <div className="mt-3 flex justify-between">
        <span className="text-xs">{`${index + 1} of ${total}`}</span>
        <button type="button" onClick={next}>
          {isLast ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}

export function Help() {
  const { start, running } = useTour();
  return (
    <button type="button" onClick={() => start("onboarding")}>
      {running ? "Touring" : "Show me around"}
    </button>
  );
}

export function Headless() {
  const { status, step, stepIndex, total, rect, theme, next, prev, skip, stop } = useTourState();
  return (
    <div style={{ color: theme.accent }}>
      {`${status} ${step?.id ?? "-"} ${stepIndex + 1}/${total} ${rect?.width ?? 0}`}
      <button type="button" onClick={next}>
        next
      </button>
      <button type="button" onClick={prev}>
        prev
      </button>
      <button type="button" onClick={skip}>
        skip
      </button>
      <button type="button" onClick={stop}>
        stop
      </button>
    </div>
  );
}

export function Row() {
  const ref = useTourTarget<HTMLDivElement>("third-row");
  return <div ref={ref}>a row</div>;
}

export function Tours({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  const nav = useMemo(
    () => createNavAdapter({ pathname, navigate: (route) => console.log(route) }),
    [pathname],
  );

  return (
    <TourProvider<AppContext>
      tours={[onboarding]}
      context={{ plan: "pro", reportsLoaded: true, hasFiltered: false }}
      nav={nav}
      components={{ Card }}
      theme={{ accent: "#ff0066", zIndex: 500 }}
      onEvent={(name, event) => {
        if (name === "target:timeout") console.warn("tourkit: no target for step", event.stepId);
      }}
    >
      {children}
      <button type="button" data-tour-id="post-ride">
        Post a ride
      </button>
    </TourProvider>
  );
}

export function Bare({ children }: { children: React.ReactNode }) {
  return <UnstyledProvider tours={[onboarding]}>{children}</UnstyledProvider>;
}
