import type { ScrollOptions } from "@tourkit/core";

export type ScrollBlock = NonNullable<ScrollOptions["block"]>;

export function scrollOffsetFor(
  y: number,
  height: number,
  viewportHeight: number,
  block: ScrollBlock,
): number {
  if (block === "start") return Math.max(0, y);
  if (block === "end") return Math.max(0, y + height - viewportHeight);
  return Math.max(0, y + height / 2 - viewportHeight / 2);
}

export function scrollSettings(scroll: boolean | ScrollOptions | undefined): {
  enabled: boolean;
  block: ScrollBlock;
} {
  if (scroll === false) return { enabled: false, block: "center" };
  if (scroll === true || scroll === undefined) return { enabled: true, block: "center" };
  return { enabled: true, block: scroll.block ?? "center" };
}
