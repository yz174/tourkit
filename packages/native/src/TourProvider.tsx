import {
  type EventHandler,
  type NavAdapter,
  type StorageAdapter,
  type ThemeOverride,
  type TourConfig,
  TourEngine,
} from "@tourkit/core";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { TourContext, type TourContextValue } from "./context";
import { TourHost } from "./TourHost";
import type { Insets, Slots, TargetGeometry } from "./types";
import { CoachCard } from "./ui/CoachCard";
import { ProgressDots } from "./ui/ProgressDots";
import { Spotlight } from "./ui/Spotlight";

const NO_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

const DEFAULT_SLOTS: Slots = {
  Card: CoachCard,
  Backdrop: Spotlight,
  Progress: ProgressDots,
};

export type TourProviderProps<Ctx> = {
  tours: TourConfig<Ctx>[];
  context?: Ctx;
  theme?: ThemeOverride;
  storage?: StorageAdapter;
  nav?: NavAdapter;
  onEvent?: EventHandler;
  insets?: Insets;
  components?: Partial<Slots>;
  debug?: boolean;
  children: ReactNode;
};

export function TourProvider<Ctx = unknown>({
  tours,
  context,
  theme,
  storage,
  nav,
  onEvent,
  insets = NO_INSETS,
  components,
  debug = false,
  children,
}: TourProviderProps<Ctx>) {
  const registry = useRef<Map<string, TargetGeometry>>(new Map());
  const [engine] = useState(
    () =>
      new TourEngine<Ctx>({
        tours,
        context: context as Ctx,
        ...(theme ? { theme } : {}),
        ...(storage ? { storage } : {}),
        ...(nav ? { nav } : {}),
        ...(onEvent ? { onEvent } : {}),
      }),
  );

  useEffect(() => {
    engine.setContext(context as Ctx);
  }, [engine, context]);

  useEffect(() => {
    engine.setOptions({
      tours,
      ...(theme ? { theme } : {}),
      ...(storage ? { storage } : {}),
      ...(nav ? { nav } : {}),
      ...(onEvent ? { onEvent } : {}),
    });
  }, [engine, tours, theme, storage, nav, onEvent]);

  const value = useMemo<TourContextValue>(
    () => ({
      engine: engine as unknown as TourEngine<unknown>,
      insets,
      components: { ...DEFAULT_SLOTS, ...components },
      geometry: registry.current,
      debug,
    }),
    [engine, insets, components, debug],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      <TourHost />
    </TourContext.Provider>
  );
}
