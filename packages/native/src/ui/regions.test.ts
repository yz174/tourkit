import { describe, expect, test } from "bun:test";
import { shieldRegions } from "./regions";

const SCREEN = { width: 390, height: 844 };
const at = (hole: Parameters<typeof shieldRegions>[0]) =>
  shieldRegions(hole, SCREEN.width, SCREEN.height);

function covers(regions: ReturnType<typeof shieldRegions>, x: number, y: number): boolean {
  return regions.some(
    (region) =>
      x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height,
  );
}

describe("shieldRegions", () => {
  test("covers the whole screen when there is no hole", () => {
    expect(at(null)).toEqual([{ x: 0, y: 0, width: 390, height: 844 }]);
  });

  test("covers the whole screen for a degenerate hole", () => {
    expect(at({ x: 10, y: 10, width: 0, height: 40 })).toHaveLength(1);
    expect(at({ x: 10, y: 10, width: 40, height: -2 })).toHaveLength(1);
  });

  test("leaves the hole uncovered and covers everything else", () => {
    const hole = { x: 100, y: 300, width: 120, height: 44 };
    const regions = at(hole);

    expect(covers(regions, 160, 320)).toBe(false);
    expect(covers(regions, 5, 5)).toBe(true);
    expect(covers(regions, 380, 830)).toBe(true);
    expect(covers(regions, 160, 290)).toBe(true);
    expect(covers(regions, 160, 350)).toBe(true);
    expect(covers(regions, 90, 320)).toBe(true);
    expect(covers(regions, 230, 320)).toBe(true);
  });

  test("the regions never overlap the hole edges", () => {
    const hole = { x: 100, y: 300, width: 120, height: 44 };
    const regions = at(hole);

    expect(covers(regions, 100, 300)).toBe(false);
    expect(covers(regions, 219, 343)).toBe(false);
    expect(covers(regions, 99, 300)).toBe(true);
    expect(covers(regions, 220, 343)).toBe(true);
  });

  test("a hole flush against the top edge produces no top band", () => {
    const regions = at({ x: 100, y: 0, width: 120, height: 44 });

    expect(regions.some((region) => region.height === 0)).toBe(false);
    expect(covers(regions, 160, 10)).toBe(false);
    expect(covers(regions, 160, 50)).toBe(true);
  });

  test("a hole flush against the left edge produces no left band", () => {
    const regions = at({ x: 0, y: 300, width: 120, height: 44 });

    expect(covers(regions, 10, 320)).toBe(false);
    expect(covers(regions, 130, 320)).toBe(true);
  });

  test("a hole covering the whole screen leaves nothing shielded", () => {
    expect(at({ x: 0, y: 0, width: 390, height: 844 })).toEqual([]);
  });

  test("a hole entirely off screen falls back to full cover", () => {
    expect(at({ x: 500, y: 300, width: 100, height: 40 })).toHaveLength(1);
    expect(at({ x: 100, y: 900, width: 100, height: 40 })).toHaveLength(1);
  });

  test("a hole hanging off the right edge is clipped, not dropped", () => {
    const regions = at({ x: 340, y: 300, width: 120, height: 44 });

    expect(covers(regions, 380, 320)).toBe(false);
    expect(covers(regions, 300, 320)).toBe(true);
  });
});
