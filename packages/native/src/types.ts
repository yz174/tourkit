import type { Rect, Theme, TourStep } from "@tourkit/core";
import type { ComponentRef, ComponentType, RefObject } from "react";
import type { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import type { MaskHole } from "./ui/geometry";
import type { PlacementResult } from "./ui/placement";

export type Insets = { top: number; bottom: number; left: number; right: number };

export type ScrollHost = RefObject<{
  scrollTo(options: { y?: number; x?: number; animated?: boolean }): void;
} | null>;

export type TargetNode = ComponentRef<typeof View>;

export type TargetGeometry = { radius?: number; padding?: number; label?: string };

export type SpotlightGeometry = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  /** Kept as the top-left corner, so an existing custom spotlight keeps working. */
  radius: SharedValue<number>;
  radiusTopRight: SharedValue<number>;
  radiusBottomRight: SharedValue<number>;
  radiusBottomLeft: SharedValue<number>;
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
  dismissible: boolean;
  next: () => void;
  prev: () => void;
  skip: () => void;
  stop: () => void;
};

export type Size = { width: number; height: number };

export type BackdropProps = {
  geometry: SpotlightGeometry;
  /**
   * Static holes for a step's `extraTargets`. They are not animated: only the main hole morphs
   * between steps, because a shared value cannot be created per element at runtime.
   */
  extraHoles?: MaskHole[];
  theme: Theme;
  size: Size;
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
