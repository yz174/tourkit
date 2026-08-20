export type {
  EventHandler,
  NavAdapter,
  Placement,
  Rect,
  StorageAdapter,
  Theme,
  ThemeOverride,
  TourConfig,
  TourEvent,
  TourEventName,
  TourStep,
} from "@tourkit/core";
export { defaultTheme, mergeTheme } from "@tourkit/core";
export { nextFocusTarget } from "./a11y/focus";
export { useEngine, useTourContext } from "./context";
export { holeClipPath, holePathData } from "./dom/clip";
export { resolveTarget, scrollIntoViewIfNeeded, toFloatingPlacement } from "./dom/resolve";
export { useTour, useTourSelector, useTourSnapshot, useTourState, useTourTarget } from "./hooks";
export { browserStorage, memoryStorage } from "./storage";
export { TourHost } from "./TourHost";
export { TourProvider, type TourProviderProps } from "./TourProvider";
export type {
  BackdropProps,
  CardPlacement,
  CardProps,
  ProgressProps,
  Slots,
} from "./types";
export { CoachCard } from "./ui/CoachCard";
export { Overlay } from "./ui/Overlay";
export { ProgressDots } from "./ui/ProgressDots";
