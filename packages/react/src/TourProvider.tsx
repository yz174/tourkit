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
import { browserStorage } from "./storage";
import { TourHost } from "./TourHost";
import type { ClassNames, Slots } from "./types";
import { CoachCard } from "./ui/CoachCard";
import { Overlay } from "./ui/Overlay";
import { ProgressDots } from "./ui/ProgressDots";

const EMPTY_CLASSES: ClassNames = {};

const DEFAULT_SLOTS: Slots = {
  Card: CoachCard,
  Backdrop: Overlay,
  Progress: ProgressDots,
};

export type TourProviderProps<Ctx> = {
  tours: TourConfig<Ctx>[];
  context?: Ctx;
  theme?: ThemeOverride;
  storage?: StorageAdapter;
  nav?: NavAdapter;
  onEvent?: EventHandler;
  components?: Partial<Slots>;
  container?: Element | null;
  styled?: boolean;
  classNames?: ClassNames;
  children: ReactNode;
};

export function TourProvider<Ctx = unknown>({
  tours,
  context,
  theme,
  storage,
  nav,
  onEvent,
  components,
  container = null,
  styled = true,
  classNames = EMPTY_CLASSES,
  children,
}: TourProviderProps<Ctx>) {
  const registry = useRef<Map<string, Element>>(new Map());
  const [openHint, setOpenHint] = useState<string | null>(null);
  const resolvedStorage = useMemo(() => storage ?? browserStorage(), [storage]);
  const [engine] = useState(
    () =>
      new TourEngine<Ctx>({
        tours,
        context: context as Ctx,
        storage: storage ?? browserStorage(),
        ...(theme ? { theme } : {}),
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
      storage: storage ?? browserStorage(),
      ...(theme ? { theme } : {}),
      ...(nav ? { nav } : {}),
      ...(onEvent ? { onEvent } : {}),
    });
  }, [engine, tours, theme, storage, nav, onEvent]);

  const value = useMemo<TourContextValue>(
    () => ({
      engine: engine as unknown as TourEngine<unknown>,
      components: { ...DEFAULT_SLOTS, ...components },
      registry: registry.current,
      container,
      styled,
      classNames,
      storage: resolvedStorage,
      openHint,
      setOpenHint,
    }),
    [engine, components, container, styled, classNames, resolvedStorage, openHint],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      <TourHost />
    </TourContext.Provider>
  );
}
