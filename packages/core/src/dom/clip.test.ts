import { describe, expect, test } from "bun:test";
import { holeClipPath, holePathData, holesClipPath, holesPathData } from "./clip";

describe("holePathData", () => {
  test("always emits both subpaths so the value can interpolate", () => {
    const withHole = holePathData(1000, 800, 10, 20, 100, 40, 8);
    const withoutHole = holePathData(1000, 800, 500, 400, 0, 0, 0);

    const commands = (value: string) => value.replace(/[^A-Z]/g, "");
    expect(commands(withHole)).toBe(commands(withoutHole));
  });

  test("starts with the viewport rectangle", () => {
    expect(holePathData(1000, 800, 0, 0, 10, 10, 0).startsWith("M0 0H1000V800H0Z")).toBe(true);
  });

  test("clamps the radius to half the smaller side", () => {
    expect(holePathData(1000, 800, 0, 0, 100, 40, 999)).toBe(
      holePathData(1000, 800, 0, 0, 100, 40, 20),
    );
  });

  test("floors negative sizes at zero", () => {
    expect(holePathData(1000, 800, 5, 5, -20, -20, 4)).toBe(holePathData(1000, 800, 5, 5, 0, 0, 4));
  });

  test("places the hole where it was asked to be", () => {
    const path = holePathData(1000, 800, 30, 50, 100, 40, 0);

    expect(path).toContain("M30 50");
    expect(path).toContain("H130");
    expect(path).toContain("V90");
  });
});

describe("holeClipPath", () => {
  test("wraps the path data as an evenodd clip-path value", () => {
    const value = holeClipPath(1000, 800, 10, 20, 100, 40, 8);

    expect(value.startsWith('path(evenodd, "')).toBe(true);
    expect(value.endsWith('")')).toBe(true);
    expect(value).toContain(holePathData(1000, 800, 10, 20, 100, 40, 8));
  });
});

describe("per-corner radius", () => {
  test("a Corners object with equal values matches the single-number form", () => {
    expect(
      holePathData(1000, 800, 10, 20, 100, 40, {
        topLeft: 8,
        topRight: 8,
        bottomRight: 8,
        bottomLeft: 8,
      }),
    ).toBe(holePathData(1000, 800, 10, 20, 100, 40, 8));
  });

  test("a corner left out is square", () => {
    expect(holePathData(1000, 800, 0, 0, 100, 40, { topLeft: 8 })).toBe(
      holePathData(1000, 800, 0, 0, 100, 40, {
        topLeft: 8,
        topRight: 0,
        bottomRight: 0,
        bottomLeft: 0,
      }),
    );
  });

  test("different corners produce a different path", () => {
    expect(holePathData(1000, 800, 0, 0, 100, 40, { topLeft: 8 })).not.toBe(
      holePathData(1000, 800, 0, 0, 100, 40, { topRight: 8 }),
    );
  });

  test("each corner clamps to half the smaller side", () => {
    expect(holePathData(1000, 800, 0, 0, 100, 40, { topLeft: 999 })).toBe(
      holePathData(1000, 800, 0, 0, 100, 40, { topLeft: 20 }),
    );
  });

  test("still emits both subpaths so the value can interpolate", () => {
    const commands = (value: string) => value.replace(/[^A-Z]/g, "");

    expect(commands(holePathData(1000, 800, 10, 20, 100, 40, { topLeft: 8 }))).toBe(
      commands(holePathData(1000, 800, 10, 20, 100, 40, 8)),
    );
  });
});

describe("several holes", () => {
  test("no holes is just the viewport rectangle", () => {
    expect(holesPathData(1000, 800, [])).toBe("M0 0H1000V800H0Z");
  });

  test("one hole matches the single-rect form", () => {
    expect(holesPathData(1000, 800, [{ x: 10, y: 20, width: 100, height: 40, radius: 8 }])).toBe(
      holePathData(1000, 800, 10, 20, 100, 40, 8),
    );
  });

  test("two holes append two subpaths", () => {
    const one = holesPathData(1000, 800, [{ x: 0, y: 0, width: 50, height: 50, radius: 4 }]);
    const two = holesPathData(1000, 800, [
      { x: 0, y: 0, width: 50, height: 50, radius: 4 },
      { x: 200, y: 200, width: 50, height: 50, radius: 4 },
    ]);

    expect(two.length).toBeGreaterThan(one.length);
    expect(two.startsWith(one)).toBe(true);
  });

  test("each hole keeps its own radius", () => {
    const mixed = holesPathData(1000, 800, [
      { x: 0, y: 0, width: 100, height: 100, radius: 999 },
      { x: 200, y: 0, width: 100, height: 100, radius: 0 },
    ]);
    const same = holesPathData(1000, 800, [
      { x: 0, y: 0, width: 100, height: 100, radius: 999 },
      { x: 200, y: 0, width: 100, height: 100, radius: 999 },
    ]);

    expect(mixed).not.toBe(same);
  });

  test("a zero-sized hole is dropped rather than drawn", () => {
    expect(
      holesPathData(1000, 800, [
        { x: 0, y: 0, width: 50, height: 50, radius: 4 },
        { x: 100, y: 100, width: 0, height: 0, radius: 4 },
      ]),
    ).toBe(holesPathData(1000, 800, [{ x: 0, y: 0, width: 50, height: 50, radius: 4 }]));
  });

  test("holesClipPath wraps it as an evenodd clip-path", () => {
    const rects = [{ x: 0, y: 0, width: 50, height: 50, radius: 4 }];

    expect(holesClipPath(1000, 800, rects)).toBe(
      `path(evenodd, "${holesPathData(1000, 800, rects)}")`,
    );
  });
});
