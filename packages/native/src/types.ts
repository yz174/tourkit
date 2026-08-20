import type { Rect, Theme, TourStep } from "@tourkit/core";
import type { ComponentType } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { PlacementResult } from "./ui/placement";

export type Insets = { top: number; bottom: number; left: number; right: number };

export type TargetGeometry = { radius?: number; padding?: number };

export type SpotlightGeometry = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  radius: SharedValue<number>;
};

export type CardProps<Ctx = unknown> = {
  step: TourStep<Ctx>;
  index: number;
  total: number;
  rect: Rect | null;
  placement: PlacementResult;
  theme: Theme;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  prev: () => void;
  skip: () => void;
  stop: () => void;
};

export type BackdropProps = {
  geometry: SpotlightGeometry;
  theme: Theme;
};

export type ProgressProps = {
  index: number;
  total: number;
  theme: Theme;
};

export type Slots = {
  Card: ComponentType<CardProps<unknown>>;
  Backdrop: ComponentType<BackdropProps>;
  Progress: ComponentType<ProgressProps>;
};
