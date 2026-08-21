import type { EngineSnapshot, Rect, TargetManifest, TourConfig } from "@tourkit/core";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useEngine, useTourContext } from "./context";
import { buildManifest } from "./manifest";

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
    (tour: string | TourConfig<unknown>) => void engine.start(tour),
    [engine],
  );
  const stop = useCallback(() => void engine.stop(), [engine]);
  const next = useCallback(() => void engine.advance(), [engine]);
  const prev = useCallback(() => void engine.back(), [engine]);
  const skip = useCallback(() => void engine.skip(), [engine]);

  return { running, start, stop, next, prev, skip };
}

export function useTourState<Ctx = unknown>() {
  const engine = useEngine<Ctx>();
  const snapshot = useTourSnapshot<Ctx>();
  const target = snapshot.step?.target ?? null;
  const rect: Rect | null = target ? (snapshot.rects[target] ?? null) : null;

  const next = useCallback(() => void engine.advance(), [engine]);
  const prev = useCallback(() => void engine.back(), [engine]);
  const skip = useCallback(() => void engine.skip(), [engine]);
  const stop = useCallback(() => void engine.stop(), [engine]);

  return { ...snapshot, rect, next, prev, skip, stop };
}

export function useTourTarget<T extends Element = HTMLElement>(id: string) {
  const { registry } = useTourContext();
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element) registry.set(id, element);
    return () => {
      if (registry.get(id) === element) registry.delete(id);
    };
  }, [registry, id]);

  return ref;
}

export function useTargetManifest(): () => TargetManifest {
  const { registry } = useTourContext();
  return useCallback(
    () => buildManifest(registry, typeof window === "undefined" ? "" : window.location.pathname),
    [registry],
  );
}
