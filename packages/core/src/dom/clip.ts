import { type Radius, resolveCorners } from "../corners";

export function holePathData(
  viewportWidth: number,
  viewportHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: Radius,
): string {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  return `M0 0H${viewportWidth}V${viewportHeight}H0Z` + holeSubpath(x, y, w, h, cornerRadius);
}

/** The rounded-rectangle subpath for one hole. Always emits the same commands, so it interpolates. */
function holeSubpath(x: number, y: number, w: number, h: number, cornerRadius: Radius): string {
  const [tl, tr, br, bl] = resolveCorners(cornerRadius, w, h);
  const right = x + w;
  const bottom = y + h;

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

export function holeClipPath(
  viewportWidth: number,
  viewportHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: Radius,
): string {
  const data = holePathData(viewportWidth, viewportHeight, x, y, width, height, cornerRadius);
  return `path(evenodd, "${data}")`;
}

export type Hole = { x: number; y: number; width: number; height: number; radius: Radius };

/** One viewport rectangle, then a subpath per hole. Zero-sized holes are dropped. */
export function holesPathData(
  viewportWidth: number,
  viewportHeight: number,
  holes: Hole[],
): string {
  const outer = `M0 0H${viewportWidth}V${viewportHeight}H0Z`;

  return holes.reduce((path, hole) => {
    const w = Math.max(0, hole.width);
    const h = Math.max(0, hole.height);
    if (w === 0 || h === 0) return path;
    return path + holeSubpath(hole.x, hole.y, w, h, hole.radius);
  }, outer);
}

export function holesClipPath(
  viewportWidth: number,
  viewportHeight: number,
  holes: Hole[],
): string {
  return `path(evenodd, "${holesPathData(viewportWidth, viewportHeight, holes)}")`;
}
