import type { Rect, Theme, TourStep } from "@tourkit/core";
import type { ComponentType } from "react";

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

export type CardProps<Ctx = unknown> = {
  step: TourStep<Ctx>;
  index: number;
  total: number;
  rect: Rect | null;
  placement: CardPlacement;
  theme: Theme;
  styled: boolean;
  classNames: ClassNames;
  isFirst: boolean;
  isLast: boolean;
  dismissible: boolean;
  next: () => void;
  prev: () => void;
  skip: () => void;
  stop: () => void;
};

export type BackdropProps = {
  className?: string | undefined;
  clipPath: string;
  transition: string;
  theme: Theme;
  styled: boolean;
};

export type ProgressProps = {
  index: number;
  total: number;
  theme: Theme;
  styled: boolean;
};

export type Slots = {
  Card: ComponentType<CardProps<unknown>>;
  Backdrop: ComponentType<BackdropProps>;
  Progress: ComponentType<ProgressProps>;
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
