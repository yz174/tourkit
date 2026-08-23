import type { Rect } from "@tourkit/core";

export type Candidate = { id: string; rect: Rect };

function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function area(rect: Rect): number {
  return Math.max(rect.width, 0) * Math.max(rect.height, 0);
}

export function pickTarget(candidates: Candidate[], x: number, y: number): string | null {
  let best: Candidate | null = null;

  for (const candidate of candidates) {
    if (area(candidate.rect) <= 0) continue;
    if (!contains(candidate.rect, x, y)) continue;
    if (best === null || area(candidate.rect) < area(best.rect)) best = candidate;
  }

  return best?.id ?? null;
}
