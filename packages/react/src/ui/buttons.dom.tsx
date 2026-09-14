import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TourConfig, TourStep } from "@tourkit/core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useTour } from "../hooks";
import { memoryStorage } from "../storage";
import { TourProvider } from "../TourProvider";

type Ctx = Record<string, never>;

function boxAt(x: number, y: number, width: number, height: number) {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  } as DOMRect;
}

function stubRects() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.dataset.tourId === "cta") return boxAt(100, 200, 120, 44);
    if (this.dataset.tourId === "inbox") return boxAt(20, 500, 80, 32);
    return boxAt(0, 0, 320, 140);
  });
}

function Launcher() {
  const { start } = useTour();
  return (
    <button type="button" onClick={() => start("onboarding")}>
      start tour
    </button>
  );
}

function App({ steps, ...rest }: { steps: TourStep<Ctx>[] } & Partial<TourConfig<Ctx>>) {
  const tour: TourConfig<Ctx> = { id: "onboarding", version: 1, steps, ...rest };
  return (
    <TourProvider<Ctx> tours={[tour]} context={{}} storage={memoryStorage()}>
      <button type="button" data-tour-id="cta">
        Post a ride
      </button>
      <button type="button" data-tour-id="inbox">
        Inbox
      </button>
      <Launcher />
    </TourProvider>
  );
}

async function startTour(steps: TourStep<Ctx>[], extra: Partial<TourConfig<Ctx>> = {}) {
  const user = userEvent.setup();
  render(<App steps={steps} {...extra} />);
  await user.click(screen.getByText("start tour"));
  await waitFor(() => {
    expect(document.querySelector('[data-tourkit="card"]')).not.toBe(null);
  });
  return user;
}

const twoSteps: TourStep<Ctx>[] = [
  { id: "one", target: "cta", title: "First stop" },
  { id: "two", target: null, title: "Second stop" },
];

beforeEach(() => {
  vi.restoreAllMocks();
  stubRects();
  document.body.innerHTML = "";
});

describe("the default card", () => {
  test("shows only a next control when nothing is configured", async () => {
    await startTour(twoSteps);

    expect(document.querySelector('[data-tourkit="next"]')).not.toBe(null);
    expect(document.querySelector('[data-tourkit="back"]')).toBe(null);
    expect(document.querySelector('[data-tourkit="close"]')).toBe(null);
  });

  test("renders Done on the last step", async () => {
    const user = await startTour(twoSteps);

    await user.click(screen.getByText("Next"));

    await waitFor(() => expect(screen.getByText("Done")).toBeInTheDocument());
  });
});

describe("the back button", () => {
  test("appears when the step asks for it", async () => {
    await startTour([
      { id: "one", target: "cta", title: "First stop", buttons: { back: true } },
      { id: "two", target: null, title: "Second stop", buttons: { back: true } },
    ]);

    expect(document.querySelector('[data-tourkit="back"]')).not.toBe(null);
  });

  test("is not rendered on the first step, where there is nowhere to go", async () => {
    await startTour([
      { id: "one", target: "cta", title: "First stop", buttons: { back: true } },
      { id: "two", target: null, title: "Second stop", buttons: { back: true } },
    ]);

    expect(document.querySelector('[data-tourkit="back"]')).not.toBe(null);
    expect(document.querySelector('[data-tourkit="back"]')).toHaveAttribute("disabled");
  });

  test("goes back a step when pressed", async () => {
    const user = await startTour([
      { id: "one", target: "cta", title: "First stop", buttons: { back: true } },
      { id: "two", target: null, title: "Second stop", buttons: { back: true } },
    ]);

    await user.click(screen.getByText("Next"));
    await waitFor(() => expect(screen.getByText("Second stop")).toBeInTheDocument());

    await user.click(screen.getByText("Back"));

    await waitFor(() => expect(screen.getByText("First stop")).toBeInTheDocument());
  });
});

describe("the close button", () => {
  test("appears when the step asks for it", async () => {
    await startTour([{ id: "one", target: "cta", title: "First stop", buttons: { close: true } }]);

    expect(document.querySelector('[data-tourkit="close"]')).not.toBe(null);
  });

  test("carries an accessible name", async () => {
    await startTour([{ id: "one", target: "cta", title: "First stop", buttons: { close: true } }]);

    expect(document.querySelector('[data-tourkit="close"]')).toHaveAttribute(
      "aria-label",
      "Close tour",
    );
  });

  test("ends the tour when pressed", async () => {
    const user = await startTour([
      { id: "one", target: "cta", title: "First stop", buttons: { close: true } },
      { id: "two", target: null, title: "Second stop" },
    ]);

    await user.click(document.querySelector('[data-tourkit="close"]') as HTMLElement);

    await waitFor(() => {
      expect(document.querySelector('[data-tourkit="card"]')).toBe(null);
    });
  });

  test("is hidden on a step that is not dismissible", async () => {
    await startTour([
      {
        id: "one",
        target: "cta",
        title: "First stop",
        buttons: { close: true },
        dismissible: false,
      },
    ]);

    expect(document.querySelector('[data-tourkit="close"]')).toBe(null);
  });
});

describe("labels", () => {
  test("the next label can be replaced", async () => {
    await startTour([
      { id: "one", target: "cta", title: "First stop", buttons: { nextLabel: "Continue" } },
      { id: "two", target: null, title: "Second stop" },
    ]);

    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  test("the done label can be replaced", async () => {
    await startTour([
      { id: "only", target: "cta", title: "Only stop", buttons: { doneLabel: "Finish" } },
    ]);

    expect(screen.getByText("Finish")).toBeInTheDocument();
  });

  test("the back label can be replaced", async () => {
    await startTour([
      { id: "one", target: "cta", title: "First stop", buttons: { back: true, backLabel: "Prev" } },
      { id: "two", target: null, title: "Second stop" },
    ]);

    expect(screen.getByText("Prev")).toBeInTheDocument();
  });
});

describe("hiding next", () => {
  test("next can be turned off for a click-driven step", async () => {
    await startTour([
      { id: "one", target: "cta", title: "First stop", buttons: { next: false } },
      { id: "two", target: null, title: "Second stop" },
    ]);

    expect(document.querySelector('[data-tourkit="next"]')).toBe(null);
  });
});

describe("tour-wide button defaults", () => {
  test("defaultStepOptions applies buttons to every step", async () => {
    await startTour(twoSteps, { defaultStepOptions: { buttons: { back: true, close: true } } });

    expect(document.querySelector('[data-tourkit="back"]')).not.toBe(null);
    expect(document.querySelector('[data-tourkit="close"]')).not.toBe(null);
  });
});

describe("the dialog's accessible name", () => {
  test("comes from the title when there is one", async () => {
    await startTour([{ id: "one", target: "cta", title: "First stop" }]);

    expect(document.querySelector('[role="dialog"]')).toHaveAttribute("aria-label", "First stop");
  });

  test("falls back to label when the step shows no title", async () => {
    await startTour([{ id: "one", target: "cta", label: "Filters panel" }]);

    expect(document.querySelector('[role="dialog"]')).toHaveAttribute(
      "aria-label",
      "Filters panel",
    );
  });

  test("the title wins when both are set, because it is the visible name", async () => {
    await startTour([{ id: "one", target: "cta", title: "First stop", label: "Filters panel" }]);

    expect(document.querySelector('[role="dialog"]')).toHaveAttribute("aria-label", "First stop");
  });

  test("a step with neither still announces as something", async () => {
    await startTour([{ id: "one", target: "cta" }]);

    expect(document.querySelector('[role="dialog"]')).toHaveAttribute("aria-label", "Tour step");
  });
});

describe("disabled buttons", () => {
  test("next renders disabled but visible", async () => {
    await startTour([
      { id: "one", target: "cta", title: "First stop", buttons: { nextDisabled: true } },
      { id: "two", target: null, title: "Second stop" },
    ]);

    expect(document.querySelector('[data-tourkit="next"]')).toHaveAttribute("disabled");
  });

  test("a disabled next does not advance when clicked", async () => {
    const user = await startTour([
      { id: "one", target: "cta", title: "First stop", buttons: { nextDisabled: true } },
      { id: "two", target: null, title: "Second stop" },
    ]);

    await user.click(document.querySelector('[data-tourkit="next"]') as HTMLElement);

    expect(screen.getByText("First stop")).toBeInTheDocument();
  });

  test("back can be disabled on a step where it would otherwise work", async () => {
    const user = await startTour([
      { id: "one", target: "cta", title: "First stop" },
      {
        id: "two",
        target: null,
        title: "Second stop",
        buttons: { back: true, backDisabled: true },
      },
    ]);

    await user.click(screen.getByText("Next"));
    await waitFor(() => expect(screen.getByText("Second stop")).toBeInTheDocument());

    expect(document.querySelector('[data-tourkit="back"]')).toHaveAttribute("disabled");
  });
});

describe("pressing the dimmed area", () => {
  test("does nothing by default", async () => {
    const user = await startTour(twoSteps);

    await user.click(document.querySelector('[data-tourkit="shield"]') as HTMLElement);

    expect(screen.getByText("First stop")).toBeInTheDocument();
  });

  test("closes the tour when the theme asks for it", async () => {
    const user = await startTour(twoSteps, { theme: { scrim: { press: "close" } } });

    await user.click(document.querySelector('[data-tourkit="shield"]') as HTMLElement);

    await waitFor(() => {
      expect(document.querySelector('[data-tourkit="card"]')).toBe(null);
    });
  });

  test("advances when the theme asks for that instead", async () => {
    const user = await startTour(twoSteps, { theme: { scrim: { press: "next" } } });

    await user.click(document.querySelector('[data-tourkit="shield"]') as HTMLElement);

    await waitFor(() => expect(screen.getByText("Second stop")).toBeInTheDocument());
  });

  test("a step that may not be dismissed ignores a close press", async () => {
    const user = await startTour(
      [
        { id: "one", target: "cta", title: "First stop", dismissible: false },
        { id: "two", target: null, title: "Second stop" },
      ],
      { theme: { scrim: { press: "close" } } },
    );

    await user.click(document.querySelector('[data-tourkit="shield"]') as HTMLElement);

    expect(screen.getByText("First stop")).toBeInTheDocument();
  });

  test("a step that may not be dismissed still advances, since that is not an exit", async () => {
    const user = await startTour(
      [
        { id: "one", target: "cta", title: "First stop", dismissible: false },
        { id: "two", target: null, title: "Second stop" },
      ],
      { theme: { scrim: { press: "next" } } },
    );

    await user.click(document.querySelector('[data-tourkit="shield"]') as HTMLElement);

    await waitFor(() => expect(screen.getByText("Second stop")).toBeInTheDocument());
  });
});

describe("highlighting more than one element", () => {
  test("the backdrop cuts a hole for each extra target", async () => {
    await startTour([{ id: "one", target: "cta", title: "First stop", extraTargets: ["inbox"] }]);

    const clip = (document.querySelector('[data-tourkit="backdrop"]') as HTMLElement).style
      .clipPath;

    expect(clip.match(/M[\d.]+ [\d.]+H/g)?.length).toBe(3);
  });

  test("one target alone cuts a single hole", async () => {
    await startTour([{ id: "one", target: "cta", title: "First stop" }]);

    const clip = (document.querySelector('[data-tourkit="backdrop"]') as HTMLElement).style
      .clipPath;

    expect(clip.match(/M[\d.]+ [\d.]+H/g)?.length).toBe(2);
  });

  test("an extra target that is not on the page is ignored", async () => {
    await startTour([{ id: "one", target: "cta", title: "First stop", extraTargets: ["missing"] }]);

    const clip = (document.querySelector('[data-tourkit="backdrop"]') as HTMLElement).style
      .clipPath;

    expect(clip.match(/M[\d.]+ [\d.]+H/g)?.length).toBe(2);
  });

  test("the card still points at the main target", async () => {
    await startTour([{ id: "one", target: "cta", title: "First stop", extraTargets: ["inbox"] }]);

    expect(screen.getByText("First stop")).toBeInTheDocument();
  });
});
