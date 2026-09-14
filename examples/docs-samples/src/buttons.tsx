import { resolveButtons, type TourConfig } from "@tourkit/core";
import { type CardProps, TourProvider, useEngine, useTour, useTourState } from "@tourkit/react";
import { type ReactNode, useEffect } from "react";

type Ctx = { invitesSent: boolean };

// docs/steps.md — Buttons
const withButtons: TourConfig<Ctx> = {
  id: "onboarding",
  version: 1,
  steps: [
    {
      id: "filters",
      target: "filters",
      title: "Filter your rides",
      buttons: { back: true, close: true },
    },
    {
      id: "compose",
      target: "compose",
      title: "Post a ride",
      buttons: { next: false },
    },
    // docs/steps.md — a step with no visible title, named for screen readers
    {
      id: "filters",
      target: "filters",
      body: "Narrow the list.",
      label: "Filters panel",
      buttons: { nextDisabled: true, back: true, backDisabled: true },
    },
    {
      id: "done",
      target: null,
      title: "That is the tour",
      buttons: { back: true, doneLabel: "Finish", backLabel: "One more look" },
    },
  ],
};

// docs/steps.md — Tour-wide defaults
const withDefaults: TourConfig<Ctx> = {
  id: "billing",
  version: 2,
  defaultStepOptions: {
    interaction: "passthrough",
    gateTimeoutMs: 10000,
    buttons: { back: true, close: true },
  },
  steps: [
    { id: "plan", target: "plan" },
    { id: "card", target: "card", interaction: "block" },
  ],
};

// docs/steps.md — Blocking a transition
const guarded: TourConfig<Ctx> = {
  id: "invites",
  version: 1,
  onBeforeExit: async () => window.confirm("Leave the tour?"),
  steps: [
    {
      id: "invite",
      target: "invite",
      title: "Invite your team",
      // docs/steps.md — hooks receive a StepInfo second argument
      onBeforeAdvance: ({ invitesSent }, { index, total }) => invitesSent && index < total,
      onBeforeBack: (_ctx, { stepId }) => stepId === "invite",
      onEnter: (_ctx, { index, total, tourId }) => {
        void `${tourId}:${index}/${total}`;
      },
      onAdvance: (_ctx, info) => void info.stepId,
    },
    {
      id: "last",
      target: null,
      title: "Done",
      onBeforeExit: () => true,
    },
  ],
};

// docs/theme.md — per-corner radius, card offset, arrow padding, progress template
const themed: TourConfig<Ctx> = {
  id: "themed",
  version: 1,
  theme: {
    card: { offset: 20 },
    arrow: { padding: 4 },
    progress: { style: "numbers", template: "Step {{current}} of {{total}}" },
  },
  steps: [
    { id: "tab", target: "tab", radius: { topLeft: 12, topRight: 12 } },
    { id: "fab", target: "fab", radius: 999, padding: 12 },
    // docs/theme.md — dropping the arrow for one step
    { id: "wide", target: "table", theme: { arrow: { show: false } } },
  ],
};

// docs/steps.md — highlighting more than one element
const multi: TourConfig<Ctx> = {
  id: "totals",
  version: 1,
  theme: { scrim: { press: "next" } },
  steps: [
    {
      id: "totals",
      target: "summary-row",
      title: "Your totals",
      extraTargets: ["tax-row", "shipping-row"],
      padding: 6,
      radius: 8,
    },
  ],
};

// docs/provider.md — Controls
function Launcher() {
  const { start, moveTo, show, next, prev, skip, stop, refresh, isOpen, whenShown, running } =
    useTour();

  return (
    <div>
      <button type="button" onClick={() => start("onboarding")}>
        Show me around
      </button>
      <button type="button" onClick={() => start("onboarding", { at: 2 })}>
        Skip to the end
      </button>
      <button type="button" onClick={() => start("onboarding", { at: "compose" })}>
        Start at posting
      </button>
      <button type="button" onClick={() => moveTo(1)} disabled={!running}>
        Second step
      </button>
      <button type="button" onClick={() => show("done")} disabled={!running}>
        Last step
      </button>
      <button type="button" onClick={next}>
        Next
      </button>
      <button type="button" onClick={prev}>
        Back
      </button>
      <button type="button" onClick={skip}>
        Skip
      </button>
      <button type="button" onClick={stop}>
        Stop
      </button>
      <button type="button" onClick={refresh}>
        Remeasure
      </button>
      <button
        type="button"
        // docs/steps.md — waiting for a step
        onClick={() => {
          void whenShown("filters").then((shown) => shown && isOpen("filters"));
        }}
      >
        Wait for filters
      </button>
    </div>
  );
}

// docs/steps.md — watching one step
function WatchBilling() {
  const engine = useEngine();

  useEffect(() => {
    return engine.onStep("billing", (name, info) => {
      if (name === "show") {
        void `${info.tourId}:${info.stepId} ${info.index + 1}/${info.total}`;
      }
    });
  }, [engine]);

  return null;
}

// docs/provider.md — Reading where the tour is
function Position() {
  const { isFirst, isLast, hasNext, hasPrev, stepIndex, total } = useTourState<Ctx>();

  return (
    <p>
      {stepIndex + 1} of {total}
      {isFirst ? " (first)" : null}
      {isLast ? " (last)" : null}
      {hasNext ? " more ahead" : null}
      {hasPrev ? " more behind" : null}
    </p>
  );
}

// docs/accessibility.md — a custom card reading the same button config
function Card({ step, isFirst, isLast, dismissible, next, prev, stop }: CardProps) {
  const buttons = resolveButtons(step, dismissible);

  return (
    <div>
      <h3>{step.title}</h3>
      {buttons.close ? (
        <button type="button" aria-label={buttons.closeLabel} onClick={stop}>
          &times;
        </button>
      ) : null}
      {buttons.back ? (
        <button type="button" onClick={prev} disabled={isFirst}>
          {buttons.backLabel}
        </button>
      ) : null}
      {buttons.next ? (
        <button type="button" onClick={next}>
          {buttons.advanceLabel(isLast)}
        </button>
      ) : null}
    </div>
  );
}

export function App({ children }: { children: ReactNode }) {
  return (
    <TourProvider<Ctx>
      tours={[withButtons, withDefaults, guarded, themed, multi]}
      context={{ invitesSent: false }}
      components={{ Card }}
      scrollHandler={(element, { block, behavior }, step) => {
        // docs/provider.md — Scrolling it yourself
        void step;
        element.scrollIntoView({ block, behavior });
      }}
    >
      <Launcher />
      <Position />
      <WatchBilling />
      {children}
    </TourProvider>
  );
}
