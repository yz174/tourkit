import type { TourStep } from "../types";

export type CardPlacement = {
  left: number;
  top: number;
  side: "top" | "bottom" | "left" | "right" | "center";
  arrow: { left: number; top: number } | null;
};

export type ClassNames = {
  root?: string;
  overlay?: string;
  card?: string;
  arrow?: string;
  progress?: string;
};

/**
 * Replaces the built-in scrolling. `behavior` already accounts for reduced motion, so a handler
 * that respects it can pass the value straight through.
 */
export type ScrollHandler = (
  element: Element,
  settings: { block: ScrollLogicalPosition; behavior: ScrollBehavior },
  step: TourStep<unknown>,
) => void;
