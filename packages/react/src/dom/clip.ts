export function holePathData(
  viewportWidth: number,
  viewportHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number,
): string {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const r = Math.max(0, Math.min(cornerRadius, w / 2, h / 2));
  const right = x + w;
  const bottom = y + h;

  const outer = `M0 0H${viewportWidth}V${viewportHeight}H0Z`;
  const inner =
    `M${x + r} ${y}` +
    `H${right - r}` +
    `A${r} ${r} 0 0 1 ${right} ${y + r}` +
    `V${bottom - r}` +
    `A${r} ${r} 0 0 1 ${right - r} ${bottom}` +
    `H${x + r}` +
    `A${r} ${r} 0 0 1 ${x} ${bottom - r}` +
    `V${y + r}` +
    `A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

  return outer + inner;
}

export function holeClipPath(
  viewportWidth: number,
  viewportHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number,
): string {
  const data = holePathData(viewportWidth, viewportHeight, x, y, width, height, cornerRadius);
  return `path(evenodd, "${data}")`;
}
