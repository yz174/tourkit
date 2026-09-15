import type { Rect, Theme, TourStep } from "@tourkit/core";
import type { CardPlacement, ClassNames } from "@tourkit/core/dom";
import type { ComponentType } from "react";

// The shapes plain DOM shares with React live in @tourkit/core/dom; only the slots below need React.
export type { CardPlacement, ClassNames, ScrollHandler } from "@tourkit/core/dom";

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
