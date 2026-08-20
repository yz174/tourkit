import { describe, expect, test } from "bun:test";
import { type Rect, rectsEqual } from "./rect";

const rect = (x: number, y: number, width: number, height: number): Rect => ({
  x,
  y,
  width,
  height,
});

describe("rectsEqual", () => {
  test("treats sub-epsilon drift as equal", () => {
    expect(rectsEqual(rect(0, 0, 10, 10), rect(0.4, 0.4, 10.4, 10.4))).toBe(true);
  });

  test("treats movement at or beyond epsilon as different", () => {
    expect(rectsEqual(rect(0, 0, 10, 10), rect(0.5, 0, 10, 10))).toBe(false);
    expect(rectsEqual(rect(0, 0, 10, 10), rect(0, 0, 10, 10.5))).toBe(false);
  });

  test("null only equals null", () => {
    expect(rectsEqual(null, null)).toBe(true);
    expect(rectsEqual(null, rect(0, 0, 1, 1))).toBe(false);
    expect(rectsEqual(rect(0, 0, 1, 1), null)).toBe(false);
  });

  test("the epsilon is adjustable", () => {
    expect(rectsEqual(rect(0, 0, 10, 10), rect(2, 0, 10, 10), 3)).toBe(true);
  });
});
