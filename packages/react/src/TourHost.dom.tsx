import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TourConfig } from "@tourkit/core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useTour } from "./hooks";
import { memoryStorage } from "./storage";
import { TourProvider } from "./TourProvider";
import type { CardProps } from "./types";
import { TourProvider as UnstyledProvider } from "./unstyled";

type Ctx = { isHost: boolean };

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

const tours: TourConfig<Ctx>[] = [
  {
    id: "onboarding",
    version: 1,
    steps: [
      { id: "one", target: "cta", title: "First stop", body: "Press this." },
      { id: "two", target: "inbox", title: "Second stop", body: "Then this." },
      { id: "three", target: null, title: "All done" },
    ],
  },
];

function Launcher() {
  const { start, running } = useTour();
  return (
    <button type="button" onClick={() => start("onboarding")}>
      {running ? "running" : "start tour"}
    </button>
  );
}

function App({
  children,
  ...props
}: Partial<React.ComponentProps<typeof TourProvider<Ctx>>> & { children?: React.ReactNode }) {
  return (
    <TourProvider<Ctx>
      tours={tours}
      context={{ isHost: false }}
      storage={memoryStorage()}
      {...props}
    >
      <button type="button" data-tour-id="cta">
        Post a ride
      </button>
      <button type="button" data-tour-id="inbox">
        Inbox
      </button>
      <Launcher />
      {children}
    </TourProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  stubRects();
  document.body.innerHTML = "";
});

describe("mounting", () => {
  test("renders nothing until a tour starts", () => {
    render(<App />);

    expect(document.querySelector('[data-tourkit="root"]')).toBe(null);
  });

  test("portals the overlay into document.body once a tour starts", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));

    await waitFor(() => {
      expect(document.body.querySelector('[data-tourkit="root"]')).not.toBe(null);
    });
  });

  test("portals into a custom container when one is given", async () => {
    const container = document.createElement("div");
    container.id = "portal-here";
    document.body.appendChild(container);
    const user = userEvent.setup();
    render(<App container={container} />);

    await user.click(screen.getByText("start tour"));

    await waitFor(() => {
      expect(container.querySelector('[data-tourkit="root"]')).not.toBe(null);
    });
  });
});

describe("the active step", () => {
  test("resolves the target by data-tour-id and becomes active", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));

    await waitFor(() => {
      expect(
        document.querySelector('[data-tourkit="root"]')?.getAttribute("data-tourkit-state"),
      ).toBe("active");
    });
    expect(screen.getByText("First stop")).toBeInTheDocument();
    expect(screen.getByText("Press this.")).toBeInTheDocument();
  });

  test("the card is an aria dialog labelled by the step title", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "First stop");
  });

  test("the backdrop carries an evenodd clip-path cut at the padded target rect", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));

    await waitFor(() => {
      const clip = document.querySelector<HTMLElement>('[data-tourkit="backdrop"]')?.style.clipPath;
      expect(clip).toContain("evenodd");
      expect(clip).toContain("M108 196");
      expect(clip).toContain("A12 12 0 0 1 224 208");
      expect(clip).toContain("A12 12 0 0 1 96 236");
    });
  });

  test("a step with no target still renders, centred", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Second stop");
    await user.click(screen.getByRole("button", { name: "Next" }));

    const wrap = await waitFor(() => {
      const node = document.querySelector<HTMLElement>('[data-tourkit="card-wrap"]');
      expect(node?.getAttribute("data-tourkit-placement")).toBe("center");
      return node;
    });
    expect(wrap?.style.transform).toBe("translate(-50%, -50%)");
    expect(screen.getByText("All done")).toBeInTheDocument();
  });
});

describe("navigation", () => {
  test("the next button advances and the last step says Done", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Second stop")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  test("ArrowRight advances and ArrowLeft goes back", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");

    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("Second stop")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(await screen.findByText("First stop")).toBeInTheDocument();
  });

  test("Escape ends the tour", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(document.querySelector('[data-tourkit="root"]')).toBe(null);
    });
  });

  test("finishing the last step ends the tour", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Second stop");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("button", { name: "Done" });
    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => {
      expect(document.querySelector('[data-tourkit="root"]')).toBe(null);
    });
  });
});

describe("focus", () => {
  test("focus moves into the card when a step activates", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next" }));
    });
  });

  test("Tab stays inside the card", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");

    await user.keyboard("{Tab}");

    const card = document.querySelector('[data-tourkit="card-wrap"]');
    expect(card?.contains(document.activeElement)).toBe(true);
  });
});

describe("events and conditional steps", () => {
  test("events fire in order with the step ids", async () => {
    const seen: string[] = [];
    const user = userEvent.setup();
    render(<App onEvent={(name, payload) => seen.push(`${name}:${payload.stepId ?? "-"}`)} />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Second stop");

    expect(seen.slice(0, 4)).toEqual([
      "tour:start:one",
      "step:enter:one",
      "step:exit:one",
      "step:enter:two",
    ]);
  });

  test("a when predicate removes a step from the count", async () => {
    const conditional: TourConfig<Ctx>[] = [
      {
        id: "onboarding",
        version: 1,
        steps: [
          { id: "one", target: "cta", title: "First stop" },
          { id: "hidden", target: "inbox", when: (ctx) => ctx.isHost },
        ],
      },
    ];
    const user = userEvent.setup();
    render(<App tours={conditional} />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");

    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });
});

describe("customization", () => {
  test("a custom card slot replaces the default", async () => {
    function MyCard({ step, index, total, next }: CardProps) {
      return (
        <div>
          <span>{`custom ${step.title} ${index + 1}/${total}`}</span>
          <button type="button" onClick={next}>
            Onwards
          </button>
        </div>
      );
    }
    const user = userEvent.setup();
    render(<App components={{ Card: MyCard }} />);

    await user.click(screen.getByText("start tour"));

    expect(await screen.findByText("custom First stop 1/3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBe(null);
  });

  test("the theme reaches the rendered card", async () => {
    const user = userEvent.setup();
    render(<App theme={{ accent: "rgb(255, 0, 102)" }} />);

    await user.click(screen.getByText("start tour"));

    const button = await screen.findByRole("button", { name: "Next" });
    expect(button).toHaveStyle({ color: "rgb(255, 0, 102)" });
  });
});

describe("the unstyled entry", () => {
  test("keeps structural styles and drops cosmetic ones", async () => {
    const user = userEvent.setup();
    render(
      <UnstyledProvider<Ctx> tours={tours} context={{ isHost: false }} storage={memoryStorage()}>
        <button type="button" data-tour-id="cta">
          Post a ride
        </button>
        <Launcher />
      </UnstyledProvider>,
    );

    await user.click(screen.getByText("start tour"));

    const backdrop = await waitFor(() => {
      const node = document.querySelector<HTMLElement>('[data-tourkit="backdrop"]');
      expect(node).not.toBe(null);
      return node as HTMLElement;
    });

    expect(backdrop.style.position).toBe("fixed");
    expect(backdrop.style.clipPath).toContain("evenodd");
    expect(backdrop.style.backgroundColor).toBe("");

    const card = document.querySelector<HTMLElement>('[data-tourkit="card"]');
    expect(card?.style.backgroundColor).toBe("");
    expect(card?.getAttribute("data-tourkit-placement")).not.toBe(null);
  });
});

describe("missing targets", () => {
  test("a step whose target never appears is skipped", async () => {
    const missing: TourConfig<Ctx>[] = [
      {
        id: "onboarding",
        version: 1,
        steps: [
          { id: "ghost", target: "#nope", gateTimeoutMs: 30, title: "Never shown" },
          { id: "real", target: "cta", title: "First stop" },
        ],
      },
    ];
    const seen: string[] = [];
    const user = userEvent.setup();
    render(<App tours={missing} onEvent={(name) => seen.push(name)} />);

    await user.click(screen.getByText("start tour"));

    expect(await screen.findByText("First stop")).toBeInTheDocument();
    expect(seen).toContain("target:timeout");
    expect(seen).toContain("step:skip");
  });
});

describe("act coverage", () => {
  test("starting through the engine directly also renders", async () => {
    render(<App />);
    await act(async () => {
      screen.getByText("start tour").click();
    });

    await waitFor(() => {
      expect(document.querySelector('[data-tourkit="root"]')).not.toBe(null);
    });
  });
});

describe("interaction modes", () => {
  const withInteraction = (interaction: "block" | "passthrough" | "advance-on-press") =>
    [
      {
        id: "onboarding",
        version: 1,
        steps: [
          { id: "one", target: "cta", title: "First stop", interaction },
          { id: "two", target: "inbox", title: "Second stop" },
        ],
      },
    ] as TourConfig<Ctx>[];

  test("block is the default and covers the whole screen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");

    expect(document.querySelector('[data-tourkit="shield"]')).not.toBe(null);
    expect(document.querySelector('[data-tourkit="hole-catcher"]')).toBe(null);
    expect(
      document.querySelector('[data-tourkit="root"]')?.getAttribute("data-tourkit-interaction"),
    ).toBe("block");
  });

  test("passthrough removes the shield so the real element stays clickable", async () => {
    const user = userEvent.setup();
    render(<App tours={withInteraction("passthrough")} />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");

    expect(document.querySelector('[data-tourkit="shield"]')).toBe(null);
    expect(document.querySelector('[data-tourkit="hole-catcher"]')).toBe(null);
  });

  test("advance-on-press keeps the shield and adds a catcher over the hole", async () => {
    const user = userEvent.setup();
    render(<App tours={withInteraction("advance-on-press")} />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");

    expect(document.querySelector('[data-tourkit="shield"]')).not.toBe(null);
    const catcher = document.querySelector<HTMLElement>('[data-tourkit="hole-catcher"]');
    expect(catcher).not.toBe(null);
    expect(catcher?.style.left).toBe("96px");
    expect(catcher?.style.top).toBe("196px");
    expect(catcher?.style.width).toBe("128px");
    expect(catcher?.style.height).toBe("52px");
  });

  test("pressing the catcher advances the tour", async () => {
    const user = userEvent.setup();
    render(<App tours={withInteraction("advance-on-press")} />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");

    await user.click(document.querySelector('[data-tourkit="hole-catcher"]') as HTMLElement);

    expect(await screen.findByText("Second stop")).toBeInTheDocument();
  });

  test("the catcher is reachable by name for screen readers", async () => {
    const user = userEvent.setup();
    render(<App tours={withInteraction("advance-on-press")} />);

    await user.click(screen.getByText("start tour"));

    expect(await screen.findByRole("button", { name: "Continue: First stop" })).toBeInTheDocument();
  });
});

describe("resume", () => {
  test("a remounted provider picks up where the tour stopped", async () => {
    const shared = memoryStorage();
    const user = userEvent.setup();
    const first = render(<App storage={shared} />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Second stop");

    first.unmount();
    document.body.innerHTML = "";

    render(<App storage={shared} />);
    await user.click(screen.getByText("start tour"));

    expect(await screen.findByText("Second stop")).toBeInTheDocument();
  });

  test("a finished tour starts again from the beginning", async () => {
    const shared = memoryStorage();
    const user = userEvent.setup();
    const first = render(<App storage={shared} />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Second stop");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("All done");
    await user.click(screen.getByRole("button", { name: "Done" }));

    first.unmount();
    document.body.innerHTML = "";

    render(<App storage={shared} />);
    await user.click(screen.getByText("start tour"));

    expect(await screen.findByText("First stop")).toBeInTheDocument();
  });

  test("bumping the tour version discards a saved position", async () => {
    const shared = memoryStorage();
    const user = userEvent.setup();
    const first = render(<App storage={shared} />);

    await user.click(screen.getByText("start tour"));
    await screen.findByText("First stop");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Second stop");

    first.unmount();
    document.body.innerHTML = "";

    const bumped = tours.map((tour) => ({ ...tour, version: 2 }));
    render(<App storage={shared} tours={bumped} />);
    await user.click(screen.getByText("start tour"));

    expect(await screen.findByText("First stop")).toBeInTheDocument();
  });
});

describe("ring", () => {
  test("stays off unless the theme asks for it", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));

    await waitFor(() => {
      expect(document.body.querySelector('[data-tourkit="root"]')).not.toBe(null);
    });
    expect(document.body.querySelector('[data-tourkit="ring"]')).toBe(null);
  });

  test("draws around the hole when the theme turns it on", async () => {
    const user = userEvent.setup();
    render(<App theme={{ ring: { show: true, color: "#FF0000", width: 3 } }} />);

    await user.click(screen.getByText("start tour"));

    const ring = await waitFor(() => {
      const found = document.body.querySelector('[data-tourkit="ring"]') as HTMLElement | null;
      if (!found) throw new Error("no ring");
      return found;
    });
    expect(ring.style.left).toBe("93px");
    expect(ring.style.width).toBe("134px");
    expect(ring.style.borderColor).toBe("#FF0000");
  });
});

describe("blur", () => {
  test("the overlay carries no filter by default", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));

    const backdrop = await waitFor(() => {
      const found = document.body.querySelector('[data-tourkit="backdrop"]') as HTMLElement | null;
      if (!found) throw new Error("no backdrop");
      return found;
    });
    expect(backdrop.style.backdropFilter).toBe("");
  });

  test("enabling blur filters the scrim and leaves the cutout alone", async () => {
    const user = userEvent.setup();
    render(<App theme={{ blur: { enabled: true, radius: 9 } }} />);

    await user.click(screen.getByText("start tour"));

    const backdrop = await waitFor(() => {
      const found = document.body.querySelector('[data-tourkit="backdrop"]') as HTMLElement | null;
      if (!found) throw new Error("no backdrop");
      return found;
    });
    expect(backdrop.style.backdropFilter).toBe("blur(9px)");
    expect(backdrop.style.clipPath).not.toBe("");
  });
});

describe("dismissible", () => {
  test("Escape ends a tour by default", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));
    await waitFor(() => {
      expect(document.body.querySelector('[data-tourkit="root"]')).not.toBe(null);
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(document.body.querySelector('[data-tourkit="root"]')).toBe(null);
    });
  });

  test("a tour marked not dismissible ignores Escape", async () => {
    const locked: TourConfig<Ctx>[] = [{ ...tours[0], dismissible: false } as TourConfig<Ctx>];
    const user = userEvent.setup();
    render(<App tours={locked} />);

    await user.click(screen.getByText("start tour"));
    await waitFor(() => {
      expect(document.body.querySelector('[data-tourkit="root"]')).not.toBe(null);
    });

    await user.keyboard("{Escape}");

    expect(document.body.querySelector('[data-tourkit="root"]')).not.toBe(null);
  });
});

describe("class hooks", () => {
  test("stable classes ride alongside the data attributes", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("start tour"));

    await waitFor(() => {
      expect(document.body.querySelector(".tourkit-root")).not.toBe(null);
    });
    expect(document.body.querySelector(".tourkit-overlay")).not.toBe(null);
    expect(document.body.querySelector(".tourkit-card")).not.toBe(null);
  });

  test("consumer classes are appended, not replacing ours", async () => {
    const user = userEvent.setup();
    render(<App classNames={{ root: "my-root", overlay: "my-overlay", card: "my-card" }} />);

    await user.click(screen.getByText("start tour"));

    await waitFor(() => {
      expect(document.body.querySelector(".tourkit-root.my-root")).not.toBe(null);
    });
    expect(document.body.querySelector(".tourkit-overlay.my-overlay")).not.toBe(null);
    expect(document.body.querySelector(".tourkit-card.my-card")).not.toBe(null);
  });
});
