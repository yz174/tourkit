import type { Rect } from "@tourkit/core";

export function shieldRegions(
  hole: Rect | null,
  screenWidth: number,
  screenHeight: number,
): Rect[] {
  const full = { x: 0, y: 0, width: screenWidth, height: screenHeight };
  if (!hole || hole.width <= 0 || hole.height <= 0) return [full];

  const left = Math.max(0, hole.x);
  const top = Math.max(0, hole.y);
  const right = Math.min(screenWidth, hole.x + hole.width);
  const bottom = Math.min(screenHeight, hole.y + hole.height);

  if (left >= right || top >= bottom) return [full];

  const regions: Rect[] = [];
  if (top > 0) regions.push({ x: 0, y: 0, width: screenWidth, height: top });
  if (bottom < screenHeight) {
    regions.push({ x: 0, y: bottom, width: screenWidth, height: screenHeight - bottom });
  }
  if (left > 0) regions.push({ x: 0, y: top, width: left, height: bottom - top });
  if (right < screenWidth) {
    regions.push({ x: right, y: top, width: screenWidth - right, height: bottom - top });
  }
  return regions;
}
