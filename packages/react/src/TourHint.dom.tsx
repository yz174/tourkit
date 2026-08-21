import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { memoryStorage } from "./storage";
import { TourHint } from "./TourHint";
import { TourProvider } from "./TourProvider";

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

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() =>
    boxAt(100, 200, 120, 44),
  );
  document.body.innerHTML = "";
});

function App({ storage = memoryStorage() }: { storage?: ReturnType<typeof memoryStorage> }) {
  return (
    <TourProvider tours={[]} storage={storage}>
      <button type="button" data-tour-id="filters">
        Filters
      </button>
      <button type="button" data-tour-id="payouts">
        Payouts
      </button>
      <TourHint id="filters" target="filters" title="Filter by route" body="Narrow the list." />
      <TourHint id="payouts" target="payouts" title="Same-day payouts" body="Paid that evening." />
    </TourProvider>
  );
}

describe("hints", () => {
  test("render a dot per hint, with no popover until it is clicked", async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.body.querySelectorAll('[data-tourkit="hint-dot"]').length).toBe(2);
    });
    expect(document.body.querySelector('[data-tourkit="hint-card"]')).toBe(null);
  });

  test("clicking a dot opens its popover", async () => {
    const user = userEvent.setup();
    render(<App />);

    const dots = await waitFor(() => {
      const found = document.body.querySelectorAll('[data-tourkit="hint-dot"]');
      if (found.length !== 2) throw new Error("no dots");
      return found;
    });

    await user.click(dots[0] as HTMLElement);

    expect(screen.getByText("Filter by route")).not.toBe(null);
  });

  test("only one popover is open at a time", async () => {
    const user = userEvent.setup();
    render(<App />);

    const dots = await waitFor(() => {
      const found = document.body.querySelectorAll('[data-tourkit="hint-dot"]');
      if (found.length !== 2) throw new Error("no dots");
      return found;
    });

    await user.click(dots[0] as HTMLElement);
    await user.click(dots[1] as HTMLElement);

    expect(document.body.querySelectorAll('[data-tourkit="hint-card"]').length).toBe(1);
    expect(screen.getByText("Same-day payouts")).not.toBe(null);
  });

  test("dismissing removes the hint and remembers it", async () => {
    const storage = memoryStorage();
    const user = userEvent.setup();
    const { unmount } = render(<App storage={storage} />);

    const dots = await waitFor(() => {
      const found = document.body.querySelectorAll('[data-tourkit="hint-dot"]');
      if (found.length !== 2) throw new Error("no dots");
      return found;
    });

    await user.click(dots[0] as HTMLElement);
    await user.click(screen.getByText("Got it"));

    await waitFor(() => {
      expect(document.body.querySelectorAll('[data-tourkit="hint-dot"]').length).toBe(1);
    });
    expect(await storage.get("tourkit:hint:filters")).toBe("dismissed");

    unmount();
    document.body.innerHTML = "";
    render(<App storage={storage} />);

    await waitFor(() => {
      expect(document.body.querySelectorAll('[data-tourkit="hint-dot"]').length).toBe(1);
    });
  });

  test("a hint whose target is missing renders nothing", async () => {
    render(
      <TourProvider tours={[]} storage={memoryStorage()}>
        <TourHint id="ghost" target="nowhere" title="Invisible" />
      </TourProvider>,
    );

    await waitFor(() => {
      expect(document.body.querySelector('[data-tourkit="hint-dot"]')).toBe(null);
    });
  });
});
