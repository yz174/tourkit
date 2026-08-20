import type { Rect, Theme, TourStep } from "@tourkit/core";
import type { ComponentType } from "react";

export type CardPlacement = {
  left: number;
  top: number;
  side: "top" | "bottom" | "left" | "right" | "center";
  arrow: { left: number; top: number } | null;
};

export type CardProps<Ctx = unknown> = {
  step: TourStep<Ctx>;
  index: number;
  total: number;
  rect: Rect | null;
  placement: CardPlacement;
  theme: Theme;
  styled: boolean;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  prev: () => void;
  skip: () => void;
  stop: () => void;
};

export type BackdropProps = {
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
