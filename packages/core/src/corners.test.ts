import { describe, expect, test } from "bun:test";
import { padRadius, resolveCorners } from "./corners";

describe("a single number", () => {
  test("applies to all four corners", () => {
    expect(resolveCorners(8, 100, 40)).toEqual([8, 8, 8, 8]);
  });

  test("clamps to half the smaller side", () => {
    expect(resolveCorners(999, 100, 40)).toEqual([20, 20, 20, 20]);
  });

  test("floors a negative radius at zero", () => {
    expect(resolveCorners(-5, 100, 40)).toEqual([0, 0, 0, 0]);
  });
});

describe("per corner", () => {
  test("returns the four corners in path order: top-left, top-right, bottom-right, bottom-left", () => {
    expect(
      resolveCorners({ topLeft: 1, topRight: 2, bottomRight: 3, bottomLeft: 4 }, 100, 40),
    ).toEqual([1, 2, 3, 4]);
  });

  test("a corner left out is zero", () => {
    expect(resolveCorners({ topLeft: 6 }, 100, 40)).toEqual([6, 0, 0, 0]);
  });

  test("each corner clamps independently", () => {
    expect(resolveCorners({ topLeft: 999, topRight: 4 }, 100, 40)).toEqual([20, 4, 0, 0]);
  });
});

describe("degenerate boxes", () => {
  test("a zero-sized box has no radius to give", () => {
    expect(resolveCorners(8, 0, 0)).toEqual([0, 0, 0, 0]);
  });

  test("negative dimensions floor at zero", () => {
    expect(resolveCorners(8, -10, -10)).toEqual([0, 0, 0, 0]);
  });
});

describe("padRadius", () => {
  test("grows a single radius by the padding, because the hole grew too", () => {
    expect(padRadius(8, 4)).toBe(12);
  });

  test("grows every corner of a Corners object", () => {
    expect(padRadius({ topLeft: 8, bottomRight: 2 }, 4)).toEqual({
      topLeft: 12,
      topRight: 4,
      bottomRight: 6,
      bottomLeft: 4,
    });
  });

  test("never returns a negative radius", () => {
    expect(padRadius(2, -10)).toBe(0);
  });

  test("zero padding leaves a number alone", () => {
    expect(padRadius(8, 0)).toBe(8);
  });
});
