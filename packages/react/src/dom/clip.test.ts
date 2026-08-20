import { describe, expect, test } from "bun:test";
import { holeClipPath, holePathData } from "./clip";

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
