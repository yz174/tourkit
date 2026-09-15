export type Corners = {
  topLeft?: number;
  topRight?: number;
  bottomRight?: number;
  bottomLeft?: number;
};

export type Radius = number | Corners;

/** Top-left, top-right, bottom-right, bottom-left: the order a rounded-rect path draws them. */
export type CornerTuple = [number, number, number, number];

/**
 * Clamps a radius to a box. Each corner is capped at half the smaller side, which is the same
 * rule a single numeric radius has always followed.
 */
export function resolveCorners(radius: Radius, width: number, height: number): CornerTuple {
  const limit = Math.max(0, Math.min(Math.max(0, width), Math.max(0, height)) / 2);
  const clamp = (value: number | undefined) => Math.max(0, Math.min(value ?? 0, limit));

  if (typeof radius === "number") {
    const all = clamp(radius);
    return [all, all, all, all];
  }

  return [
    clamp(radius.topLeft),
    clamp(radius.topRight),
    clamp(radius.bottomRight),
    clamp(radius.bottomLeft),
  ];
}

/** Grows a radius to match a hole that has been padded outwards by the same amount. */
export function padRadius(radius: Radius, padding: number): Radius {
  const grow = (value: number | undefined) => Math.max(0, (value ?? 0) + padding);

  if (typeof radius === "number") return grow(radius);

  return {
    topLeft: grow(radius.topLeft),
    topRight: grow(radius.topRight),
    bottomRight: grow(radius.bottomRight),
    bottomLeft: grow(radius.bottomLeft),
  };
}
