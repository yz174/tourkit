import { describe, expect, test } from "bun:test";
import { holeMaskPath, roundedRectPath } from "./geometry";

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
