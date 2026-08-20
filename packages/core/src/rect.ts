export type Rect = { x: number; y: number; width: number; height: number };

export function rectsEqual(a: Rect | null, b: Rect | null, epsilon = 0.5): boolean {
  if (a === null || b === null) return a === b;
  return (
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon &&
    Math.abs(a.width - b.width) < epsilon &&
    Math.abs(a.height - b.height) < epsilon
  );
}
