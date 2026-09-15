import type { Radius } from "@tourkit/core";

/**
 * Clamps a radius to the box. Inlined rather than calling `resolveCorners` from core, because
 * this runs inside a Reanimated worklet and a worklet can only call other worklets.
 */
function corners(radius: Radius, width: number, height: number) {
  "worklet";
  const limit = Math.max(0, Math.min(Math.max(0, width), Math.max(0, height)) / 2);
  if (typeof radius === "number") {
    const all = Math.max(0, Math.min(radius, limit));
    return { tl: all, tr: all, br: all, bl: all };
  }
  return {
    tl: Math.max(0, Math.min(radius.topLeft ?? 0, limit)),
    tr: Math.max(0, Math.min(radius.topRight ?? 0, limit)),
    br: Math.max(0, Math.min(radius.bottomRight ?? 0, limit)),
    bl: Math.max(0, Math.min(radius.bottomLeft ?? 0, limit)),
  };
}

export function holeMaskPath(
  screenWidth: number,
  screenHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: Radius,
): string {
  "worklet";
  const outer = `M0 0H${screenWidth}V${screenHeight}H0Z`;
  if (width <= 0 || height <= 0) return outer;

  return outer + roundedRectPath(x, y, width, height, cornerRadius);
}

export function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: Radius,
): string {
  "worklet";
  if (width <= 0 || height <= 0) return "";

  const { tl, tr, br, bl } = corners(cornerRadius, width, height);
  const right = x + width;
  const bottom = y + height;

  return (
    `M${x + tl} ${y}` +
    `H${right - tr}` +
    `A${tr} ${tr} 0 0 1 ${right} ${y + tr}` +
    `V${bottom - br}` +
    `A${br} ${br} 0 0 1 ${right - br} ${bottom}` +
    `H${x + bl}` +
    `A${bl} ${bl} 0 0 1 ${x} ${bottom - bl}` +
    `V${y + tl}` +
    `A${tl} ${tl} 0 0 1 ${x + tl} ${y}Z`
  );
}

export type MaskHole = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: Radius;
};

/** The outer rect, then a subpath per hole. Zero-sized holes are dropped. */
export function holesMaskPath(
  screenWidth: number,
  screenHeight: number,
  holes: MaskHole[],
): string {
  "worklet";
  let path = `M0 0H${screenWidth}V${screenHeight}H0Z`;
  for (const hole of holes) {
    path += roundedRectPath(hole.x, hole.y, hole.width, hole.height, hole.radius);
  }
  return path;
}
