import { describe, expect, test } from "bun:test";
import { holeMaskPath, holesMaskPath, roundedRectPath } from "./geometry";

const OUTER = "M0 0H400V800H0Z";

describe("holeMaskPath", () => {
  test("a zero-sized hole returns the outer rect alone", () => {
    expect(holeMaskPath(400, 800, 10, 10, 0, 0, 8)).toBe(OUTER);
    expect(holeMaskPath(400, 800, 10, 10, -5, 20, 8)).toBe(OUTER);
  });

  test("a real hole appends a second subpath", () => {
    const path = holeMaskPath(400, 800, 10, 20, 100, 40, 8);

    expect(path.startsWith(OUTER)).toBe(true);
    expect(path.length).toBeGreaterThan(OUTER.length);
    expect(path.endsWith("Z")).toBe(true);
  });

  test("the corner radius is clamped to half the smaller side", () => {
    const stadium = holeMaskPath(400, 800, 0, 0, 100, 40, 999);
    const clamped = holeMaskPath(400, 800, 0, 0, 100, 40, 20);

    expect(stadium).toBe(clamped);
  });

  test("a square with a huge radius becomes a circle", () => {
    const circle = holeMaskPath(400, 800, 0, 0, 60, 60, 999);

    expect(circle).toContain("A30 30");
  });

  test("a negative radius is floored at zero", () => {
    const negative = holeMaskPath(400, 800, 0, 0, 100, 40, -10);
    const zero = holeMaskPath(400, 800, 0, 0, 100, 40, 0);

    expect(negative).toBe(zero);
  });

  test("the hole is positioned where it was asked to be", () => {
    const path = holeMaskPath(400, 800, 30, 50, 100, 40, 0);

    expect(path).toContain("M30 50");
    expect(path).toContain("H130");
    expect(path).toContain("V90");
  });
});

describe("roundedRectPath", () => {
  test("returns an empty path for a collapsed rect", () => {
    expect(roundedRectPath(0, 0, 0, 40, 8)).toBe("");
    expect(roundedRectPath(0, 0, 40, 0, 8)).toBe("");
  });

  test("clamps the radius to half the shorter side", () => {
    const path = roundedRectPath(0, 0, 40, 20, 999);
    expect(path.startsWith("M10 0")).toBe(true);
  });

  test("closes the path", () => {
    expect(roundedRectPath(10, 20, 100, 40, 8).endsWith("Z")).toBe(true);
  });
});

describe("per-corner radius", () => {
  test("equal corners match the single-number form", () => {
    expect(
      holeMaskPath(400, 800, 10, 20, 100, 40, {
        topLeft: 8,
        topRight: 8,
        bottomRight: 8,
        bottomLeft: 8,
      }),
    ).toBe(holeMaskPath(400, 800, 10, 20, 100, 40, 8));
  });

  test("a corner left out is square", () => {
    expect(holeMaskPath(400, 800, 0, 0, 100, 40, { topLeft: 8 })).toBe(
      holeMaskPath(400, 800, 0, 0, 100, 40, {
        topLeft: 8,
        topRight: 0,
        bottomRight: 0,
        bottomLeft: 0,
      }),
    );
  });

  test("different corners produce a different path", () => {
    expect(holeMaskPath(400, 800, 0, 0, 100, 40, { topLeft: 8 })).not.toBe(
      holeMaskPath(400, 800, 0, 0, 100, 40, { bottomRight: 8 }),
    );
  });

  test("each corner clamps to half the smaller side", () => {
    expect(holeMaskPath(400, 800, 0, 0, 100, 40, { topLeft: 999 })).toBe(
      holeMaskPath(400, 800, 0, 0, 100, 40, { topLeft: 20 }),
    );
  });

  test("roundedRectPath takes per-corner values too", () => {
    expect(roundedRectPath(0, 0, 100, 40, { topLeft: 8 })).not.toBe(
      roundedRectPath(0, 0, 100, 40, 8),
    );
  });
});

describe("several holes", () => {
  test("no holes is just the outer rect", () => {
    expect(holesMaskPath(400, 800, [])).toBe(OUTER);
  });

  test("one hole matches the single-rect form", () => {
    expect(holesMaskPath(400, 800, [{ x: 10, y: 20, width: 100, height: 40, radius: 8 }])).toBe(
      holeMaskPath(400, 800, 10, 20, 100, 40, 8),
    );
  });

  test("two holes append two subpaths", () => {
    const one = holesMaskPath(400, 800, [{ x: 0, y: 0, width: 50, height: 50, radius: 4 }]);
    const two = holesMaskPath(400, 800, [
      { x: 0, y: 0, width: 50, height: 50, radius: 4 },
      { x: 100, y: 100, width: 50, height: 50, radius: 4 },
    ]);

    expect(two.startsWith(one)).toBe(true);
    expect(two.length).toBeGreaterThan(one.length);
  });

  test("a zero-sized hole is dropped", () => {
    expect(
      holesMaskPath(400, 800, [
        { x: 0, y: 0, width: 50, height: 50, radius: 4 },
        { x: 100, y: 100, width: 0, height: 20, radius: 4 },
      ]),
    ).toBe(holesMaskPath(400, 800, [{ x: 0, y: 0, width: 50, height: 50, radius: 4 }]));
  });
});
