import { render, screen } from "@testing-library/react";
import { mergeTheme, type ThemeOverride } from "@tourkit/core";
import { describe, expect, test } from "vitest";
import { ProgressDots } from "./ProgressDots";

function renderProgress(override: ThemeOverride | undefined, index = 1, total = 5) {
  return render(
    <ProgressDots index={index} total={total} theme={mergeTheme(override)} styled={true} />,
  );
}

describe("progress styles", () => {
  test("dots are the default and every step gets one", () => {
    const { container } = renderProgress(undefined);

    expect(container.querySelectorAll('[data-tourkit="progress-dot"]').length).toBe(5);
    expect(container.querySelector(".tourkit-progress-dots")).not.toBe(null);
  });

  test("segmented marks exactly one step active", () => {
    const { container } = renderProgress({ progress: { style: "segmented" } });

    const active = container.querySelectorAll('[data-tourkit-active="true"]');
    expect(active.length).toBe(1);
    expect((active[0] as HTMLElement).style.width).toBe("22px");
  });

  test("dots never elongate", () => {
    const { container } = renderProgress({ progress: { style: "dots" } });

    expect(container.querySelectorAll('[data-tourkit-active="true"]').length).toBe(0);
  });

  test("numbers read one-based", () => {
    renderProgress({ progress: { style: "numbers" } }, 2, 7);

    expect(screen.getByText("3 / 7")).not.toBe(null);
  });

  test("continuous fills in proportion to the step", () => {
    const { container } = renderProgress({ progress: { style: "continuous" } }, 1, 4);

    const fill = container.querySelector('[data-tourkit="progress-fill"]') as HTMLElement;
    expect(fill.style.width).toBe("48px");
  });

  test("colours come from the tokens, falling back to the accent", () => {
    const { container } = renderProgress({
      accent: "#FF0000",
      progress: { style: "dots", restColor: "#00FF00" },
    });

    const dots = container.querySelectorAll('[data-tourkit="progress-dot"]');
    expect((dots[0] as HTMLElement).style.backgroundColor).toBe("#FF0000");
    expect((dots[4] as HTMLElement).style.backgroundColor).toBe("#00FF00");
  });

  test("a single step renders nothing", () => {
    const { container } = renderProgress(undefined, 0, 1);

    expect(container.innerHTML).toBe("");
  });
});

describe("ring", () => {
  test("nothing renders unless the token is on", () => {
    const theme = mergeTheme();
    expect(theme.ring.show).toBe(false);
  });
});
