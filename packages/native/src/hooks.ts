import type { EngineSnapshot, Rect, StartOptions, TargetManifest, TourConfig } from "@tourkit/core";
import { useCallback, useSyncExternalStore } from "react";
import { useEngine, useTourContext } from "./context";

export function useTourSnapshot<Ctx = unknown>(): EngineSnapshot<Ctx> {
  const engine = useEngine<Ctx>();
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
}

export function useTourSelector<T>(select: (snapshot: EngineSnapshot<unknown>) => T): T {
  const engine = useEngine();
  const read = useCallback(() => select(engine.getSnapshot()), [engine, select]);
  return useSyncExternalStore(engine.subscribe, read, read);
}

export function useTour() {
  const engine = useEngine();
  const running = useTourSelector((snapshot) => snapshot.status !== "idle");

  const start = useCallback(
    (tour: string | TourConfig<unknown>, options?: StartOptions) =>
      void engine.start(tour, options),
    [engine],
  );
  const stop = useCallback(() => void engine.stop(), [engine]);
  const next = useCallback(() => void engine.advance(), [engine]);
  const prev = useCallback(() => void engine.back(), [engine]);
  const skip = useCallback(() => void engine.skip(), [engine]);
  const moveTo = useCallback((index: number) => void engine.moveTo(index), [engine]);
  const show = useCallback((stepId: string) => void engine.show(stepId), [engine]);
  const refresh = useCallback(() => engine.refresh(), [engine]);
  const isOpen = useCallback((stepId: string) => engine.isOpen(stepId), [engine]);
  const whenShown = useCallback((stepId: string) => engine.whenShown(stepId), [engine]);

  return { running, start, stop, next, prev, skip, moveTo, show, refresh, isOpen, whenShown };
}

export function useTourState<Ctx = unknown>() {
  const engine = useEngine<Ctx>();
  const snapshot = useTourSnapshot<Ctx>();
  const rect: Rect | null = snapshot.activeTarget
    ? (snapshot.rects[snapshot.activeTarget] ?? null)
    : null;

  const next = useCallback(() => void engine.advance(), [engine]);
  const prev = useCallback(() => void engine.back(), [engine]);
  const skip = useCallback(() => void engine.skip(), [engine]);
  const stop = useCallback(() => void engine.stop(), [engine]);

  return { ...snapshot, rect, next, prev, skip, stop };
}

export function useTargetManifest(): () => TargetManifest {
  const { geometry, nav } = useTourContext();
  return useCallback(() => {
    const route = nav?.getRoute() ?? "";
    return [...geometry.entries()].map(([id, entry]) => ({
      id,
      ...(entry.label ? { label: entry.label } : {}),
      ...(route ? { route } : {}),
    }));
  }, [geometry, nav]);
}
