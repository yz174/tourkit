import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TourConfig } from "@tourkit/core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useTour, useTourState } from "./hooks";
import { memoryStorage } from "./storage";
import { TourProvider } from "./TourProvider";

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

const tour: TourConfig<Ctx> = {
  id: "onboarding",
  version: 1,
  steps: [
    { id: "one", target: null, title: "First stop" },
    { id: "two", target: null, title: "Second stop" },
    { id: "three", target: null, title: "Third stop" },
  ],
};

function Controls() {
  const { start, moveTo, show, refresh } = useTour();
  return (
    <>
      <button type="button" onClick={() => start("onboarding")}>
        start
      </button>
      <button type="button" onClick={() => start("onboarding", { at: 2 })}>
        start at third
      </button>
      <button type="button" onClick={() => moveTo(1)}>
        jump to index 1
      </button>
      <button type="button" onClick={() => show("three")}>
        jump to three
      </button>
      <button type="button" onClick={refresh}>
        remeasure
      </button>
    </>
  );
}

function Flags() {
  const { isFirst, isLast, hasNext, hasPrev, status } = useTourState<Ctx>();
  if (status === "idle") return null;
  return <div data-testid="flags">{`${isFirst}|${isLast}|${hasNext}|${hasPrev}`}</div>;
}

function App() {
  return (
    <TourProvider<Ctx> tours={[tour]} context={{}} storage={memoryStorage()}>
      <Controls />
      <Flags />
    </TourProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() =>
    boxAt(0, 0, 320, 140),
  );
  document.body.innerHTML = "";
});

describe("useTour controls", () => {
  test("start accepts a position to open at", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start at third"));

    await waitFor(() => expect(screen.getByText("Third stop")).toBeInTheDocument());
  });

  test("moveTo jumps to a step by index", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("start"));
    await waitFor(() => expect(screen.getByText("First stop")).toBeInTheDocument());

    await user.click(screen.getByText("jump to index 1"));

    await waitFor(() => expect(screen.getByText("Second stop")).toBeInTheDocument());
  });

  test("show jumps to a step by id", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("start"));
    await waitFor(() => expect(screen.getByText("First stop")).toBeInTheDocument());

    await user.click(screen.getByText("jump to three"));

    await waitFor(() => expect(screen.getByText("Third stop")).toBeInTheDocument());
  });
});

describe("useTourState position flags", () => {
  test("the first step reports first with a next and no previous", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start"));

    await waitFor(() =>
      expect(screen.getByTestId("flags")).toHaveTextContent("true|false|true|false"),
    );
  });

  test("the last step reports last with a previous and no next", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start at third"));

    await waitFor(() =>
      expect(screen.getByTestId("flags")).toHaveTextContent("false|true|false|true"),
    );
  });
});

describe("scrollHandler", () => {
  const scrolled: string[] = [];

  function ScrollApp() {
    const scrollTour: TourConfig<Ctx> = {
      id: "onboarding",
      version: 1,
      steps: [{ id: "one", target: "cta", title: "First stop" }],
    };
    return (
      <TourProvider<Ctx>
        tours={[scrollTour]}
        context={{}}
        storage={memoryStorage()}
        scrollHandler={(element, settings, step) => {
          scrolled.push(`${step.id}:${settings.block}:${settings.behavior}`);
          void element;
        }}
      >
        <button type="button" data-tour-id="cta">
          Post a ride
        </button>
        <Controls />
      </TourProvider>
    );
  }

  test("replaces the built-in scrolling and receives the step", async () => {
    scrolled.length = 0;
    const user = userEvent.setup();
    render(<ScrollApp />);

    await user.click(screen.getByText("start"));

    await waitFor(() => expect(scrolled).toContain("one:center:smooth"));
  });
});

describe("refresh", () => {
  function RefreshApp() {
    const refreshTour: TourConfig<Ctx> = {
      id: "onboarding",
      version: 1,
      steps: [{ id: "one", target: "cta", title: "First stop" }],
    };
    return (
      <TourProvider<Ctx> tours={[refreshTour]} context={{}} storage={memoryStorage()}>
        <button type="button" data-tour-id="cta">
          Post a ride
        </button>
        <Controls />
      </TourProvider>
    );
  }

  test("remeasures the target after the layout moved underneath it", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.dataset.tourId === "cta" ? boxAt(10, 10, 100, 40) : boxAt(0, 0, 320, 140);
    });

    const user = userEvent.setup();
    render(<RefreshApp />);
    await user.click(screen.getByText("start"));

    const backdrop = () =>
      (document.querySelector('[data-tourkit="backdrop"]') as HTMLElement | null)?.style.clipPath;
    await waitFor(() => expect(backdrop()).toBeTruthy());
    const before = backdrop();

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.dataset.tourId === "cta" ? boxAt(500, 600, 100, 40) : boxAt(0, 0, 320, 140);
    });

    await user.click(screen.getByText("remeasure"));

    await waitFor(() => expect(backdrop()).not.toBe(before));
  });
});
