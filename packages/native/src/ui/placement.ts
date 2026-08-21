import type { Align, Placement, Rect } from "@tourkit/core";

export type Insets = { top: number; bottom: number; left: number; right: number };

export type PlacementInput = {
  hole: Rect | null;
  cardWidth: number;
  cardHeight: number;
  screenWidth: number;
  screenHeight: number;
  insets: Insets;
  gap: number;
  margin: number;
  arrowSize: number;
  cardRadius: number;
  preferred: Placement;
  align: Align;
};

export type PlacementResult = {
  left: number;
  top: number;
  side: "top" | "bottom" | "center";
  arrow: { left: number; onTop: boolean } | null;
};

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export function cardWidthFor(maxWidth: number, screenWidth: number, margin: number): number {
  return Math.min(maxWidth, screenWidth - margin * 2);
}

export function resolvePlacement(input: PlacementInput): PlacementResult {
  const {
    hole,
    cardWidth,
    cardHeight,
    screenWidth,
    screenHeight,
    insets,
    gap,
    margin,
    arrowSize,
    cardRadius,
    preferred,
    align,
  } = input;

  const topLimit = insets.top + margin;
  const bottomLimit = screenHeight - insets.bottom - margin;

  if (!hole) {
    return {
      left: Math.round((screenWidth - cardWidth) / 2),
      top: Math.round((screenHeight - cardHeight) / 2),
      side: "center",
      arrow: null,
    };
  }

  const below = hole.y + hole.height + gap;
  const above = hole.y - gap - cardHeight;
  const fitsBelow = below + cardHeight <= bottomLimit;
  const fitsAbove = above >= topLimit;

  let side: "top" | "bottom";
  if (preferred === "top") side = fitsAbove ? "top" : "bottom";
  else if (preferred === "bottom") side = fitsBelow ? "bottom" : "top";
  else side = fitsBelow ? "bottom" : "top";

  const top = side === "bottom" ? below : Math.max(topLimit, above);

  const anchored =
    align === "start"
      ? hole.x
      : align === "end"
        ? hole.x + hole.width - cardWidth
        : hole.x + hole.width / 2 - cardWidth / 2;
  const left = clamp(anchored, margin, screenWidth - margin - cardWidth);

  const arrowLeft = clamp(
    hole.x + hole.width / 2 - left - arrowSize / 2,
    cardRadius,
    cardWidth - cardRadius - arrowSize,
  );

  return {
    left: Math.round(left),
    top: Math.round(top),
    side,
    arrow: { left: Math.round(arrowLeft), onTop: side === "bottom" },
  };
}
