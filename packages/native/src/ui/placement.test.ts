import { describe, expect, test } from "bun:test";
import { cardWidthFor, type PlacementInput, resolvePlacement } from "./placement";

const base: PlacementInput = {
  hole: { x: 100, y: 300, width: 120, height: 44 },
  cardWidth: 320,
  cardHeight: 140,
  screenWidth: 390,
  screenHeight: 844,
  insets: { top: 47, bottom: 34, left: 0, right: 0 },
  gap: 14,
  margin: 16,
  arrowSize: 14,
  cardRadius: 16,
  preferred: "auto",
  align: "center",
};

const at = (input: Partial<PlacementInput>) => resolvePlacement({ ...base, ...input });

describe("cardWidthFor", () => {
  test("takes the max width when the screen is wide enough", () => {
    expect(cardWidthFor(320, 390, 16)).toBe(320);
  });

  test("shrinks to fit the margins on a narrow screen", () => {
    expect(cardWidthFor(320, 320, 16)).toBe(288);
  });
});

describe("resolvePlacement without a hole", () => {
  test("centres the card and draws no arrow", () => {
    const result = at({ hole: null });

    expect(result.side).toBe("center");
    expect(result.arrow).toBe(null);
    expect(result.left).toBe(35);
    expect(result.top).toBe(352);
  });
});

describe("resolvePlacement side selection", () => {
  test("prefers below when the card fits there", () => {
    const result = at({});

    expect(result.side).toBe("bottom");
    expect(result.top).toBe(358);
    expect(result.arrow?.onTop).toBe(true);
  });

  test("flips above when below would cross the bottom inset", () => {
    const result = at({ hole: { x: 100, y: 700, width: 120, height: 44 } });

    expect(result.side).toBe("top");
    expect(result.top).toBe(546);
    expect(result.arrow?.onTop).toBe(false);
  });

  test("an explicit top preference is honoured when it fits", () => {
    const result = at({ preferred: "top" });

    expect(result.side).toBe("top");
  });

  test("an explicit top preference falls back to below when it does not fit", () => {
    const result = at({ preferred: "top", hole: { x: 100, y: 60, width: 120, height: 44 } });

    expect(result.side).toBe("bottom");
  });

  test("an explicit bottom preference falls back to above when it does not fit", () => {
    const result = at({ preferred: "bottom", hole: { x: 100, y: 700, width: 120, height: 44 } });

    expect(result.side).toBe("top");
  });

  test("left and right fall back to auto on native", () => {
    expect(at({ preferred: "left" }).side).toBe(at({ preferred: "auto" }).side);
    expect(at({ preferred: "right" }).side).toBe(at({ preferred: "auto" }).side);
  });

  test("a card too tall for either side is clamped to the top inset", () => {
    const result = at({ cardHeight: 800 });

    expect(result.top).toBe(63);
  });
});

describe("resolvePlacement horizontal clamping", () => {
  test("centres on the hole when there is room", () => {
    const result = at({ cardWidth: 200, hole: { x: 150, y: 300, width: 100, height: 40 } });

    expect(result.left).toBe(100);
  });

  test("clamps at the left margin", () => {
    const result = at({ cardWidth: 200, hole: { x: 0, y: 300, width: 40, height: 40 } });

    expect(result.left).toBe(16);
  });

  test("clamps at the right margin", () => {
    const result = at({ cardWidth: 200, hole: { x: 350, y: 300, width: 40, height: 40 } });

    expect(result.left).toBe(174);
  });

  test("a card wider than the screen still lands on the left margin", () => {
    const result = at({ cardWidth: 500 });

    expect(result.left).toBe(16);
  });
});

describe("resolvePlacement arrow", () => {
  test("points at the centre of the hole", () => {
    const result = at({ cardWidth: 200, hole: { x: 150, y: 300, width: 100, height: 40 } });

    expect(result.arrow?.left).toBe(93);
  });

  test("never rides over the left rounded corner", () => {
    const result = at({ cardWidth: 200, hole: { x: 0, y: 300, width: 20, height: 40 } });

    expect(result.arrow?.left).toBe(16);
  });

  test("never rides over the right rounded corner", () => {
    const result = at({ cardWidth: 200, hole: { x: 370, y: 300, width: 20, height: 40 } });

    expect(result.arrow?.left).toBe(170);
  });
});

describe("resolvePlacement insets", () => {
  test("a taller bottom inset can force the card above the target", () => {
    const fits = at({ hole: { x: 100, y: 500, width: 120, height: 44 } });
    const doesNot = at({
      hole: { x: 100, y: 500, width: 120, height: 44 },
      insets: { top: 47, bottom: 200, left: 0, right: 0 },
    });

    expect(fits.side).toBe("bottom");
    expect(doesNot.side).toBe("top");
  });
});

describe("align", () => {
  test("center puts the card over the middle of the hole", () => {
    const wide = {
      screenWidth: 900,
      cardWidth: 320,
      hole: { x: 300, y: 300, width: 200, height: 44 },
    };
    expect(at({ ...wide, align: "center" }).left).toBe(240);
  });

  test("start lines the card up with the left edge of the hole", () => {
    const wide = {
      screenWidth: 900,
      cardWidth: 320,
      hole: { x: 300, y: 300, width: 200, height: 44 },
    };
    expect(at({ ...wide, align: "start" }).left).toBe(300);
  });

  test("end lines the card up with the right edge of the hole", () => {
    const wide = {
      screenWidth: 900,
      cardWidth: 320,
      hole: { x: 300, y: 300, width: 200, height: 44 },
    };
    expect(at({ ...wide, align: "end" }).left).toBe(180);
  });

  test("align never pushes the card past the margin", () => {
    const result = at({ align: "start", hole: { x: 380, y: 300, width: 120, height: 44 } });
    expect(result.left).toBe(390 - 16 - 320);
  });

  test("a null target ignores align and centres on the screen", () => {
    expect(at({ hole: null, align: "end" }).left).toBe(Math.round((390 - 320) / 2));
  });
});
