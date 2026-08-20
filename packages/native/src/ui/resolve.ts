import type { Rect, Theme, TourStep } from "@tourkit/core";
import type { TargetGeometry } from "../types";

export function resolveRadius(
  step: TourStep<unknown> | null,
  target: TargetGeometry | undefined,
  theme: Theme,
): number {
  if (typeof step?.radius === "number") return step.radius;
  if (step?.radius === "auto") return target?.radius ?? 0;
  if (typeof theme.spotlight.radius === "number") return theme.spotlight.radius;
  return target?.radius ?? 0;
}

export function resolvePadding(
  step: TourStep<unknown> | null,
  target: TargetGeometry | undefined,
  theme: Theme,
): number {
  return step?.padding ?? target?.padding ?? theme.spotlight.padding;
}

export function padRect(hole: Rect, padding: number): Rect {
  return {
    x: hole.x - padding,
    y: hole.y - padding,
    width: hole.width + padding * 2,
    height: hole.height + padding * 2,
  };
}
