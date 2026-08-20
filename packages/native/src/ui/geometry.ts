export function holeMaskPath(
  screenWidth: number,
  screenHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number,
): string {
  "worklet";
  const outer = `M0 0H${screenWidth}V${screenHeight}H0Z`;
  if (width <= 0 || height <= 0) return outer;

  const r = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;

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
