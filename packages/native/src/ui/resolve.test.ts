import { describe, expect, test } from "bun:test";
import { defaultTheme, mergeTheme, type TourStep } from "@tourkit/core";
import { padRect, resolvePadding, resolveRadius } from "./resolve";

const step = (patch: Partial<TourStep<unknown>>): TourStep<unknown> => ({ id: "a", ...patch });

describe("resolveRadius", () => {
  test("an explicit number on the step wins over everything", () => {
    const theme = mergeTheme({ spotlight: { radius: 30 } });

    expect(resolveRadius(step({ radius: 4 }), { radius: 12 }, theme)).toBe(4);
  });

  test("auto reads the radius the target registered", () => {
    expect(resolveRadius(step({ radius: "auto" }), { radius: 12 }, defaultTheme)).toBe(12);
  });

  test("auto falls back to a square hole when the target registered nothing", () => {
    expect(resolveRadius(step({ radius: "auto" }), undefined, defaultTheme)).toBe(0);
  });

  test("a numeric theme radius applies when the step says nothing", () => {
    const theme = mergeTheme({ spotlight: { radius: 30 } });

    expect(resolveRadius(step({}), { radius: 12 }, theme)).toBe(30);
  });

  test("the default theme radius of auto defers to the target", () => {
    expect(resolveRadius(step({}), { radius: 12 }, defaultTheme)).toBe(12);
    expect(resolveRadius(null, undefined, defaultTheme)).toBe(0);
  });
});

describe("resolvePadding", () => {
  test("step beats target beats theme", () => {
    const theme = mergeTheme({ spotlight: { padding: 9 } });

    expect(resolvePadding(step({ padding: 1 }), { padding: 5 }, theme)).toBe(1);
    expect(resolvePadding(step({}), { padding: 5 }, theme)).toBe(5);
    expect(resolvePadding(step({}), undefined, theme)).toBe(9);
  });

  test("a padding of zero is respected rather than treated as absent", () => {
    expect(resolvePadding(step({ padding: 0 }), { padding: 5 }, defaultTheme)).toBe(0);
  });
});

describe("padRect", () => {
  test("grows the rect on every side", () => {
    expect(padRect({ x: 10, y: 20, width: 100, height: 40 }, 4)).toEqual({
      x: 6,
      y: 16,
      width: 108,
      height: 48,
    });
  });

  test("zero padding leaves the rect alone", () => {
    const rect = { x: 10, y: 20, width: 100, height: 40 };

    expect(padRect(rect, 0)).toEqual(rect);
  });
});
