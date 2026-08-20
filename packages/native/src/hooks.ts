import type { EngineSnapshot, Rect } from "@tourkit/core";
import { useCallback, useSyncExternalStore } from "react";
import { useEngine } from "./context";

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

  const start = useCallback((tourId: string) => void engine.start(tourId), [engine]);
  const stop = useCallback(() => void engine.stop(), [engine]);
  const next = useCallback(() => void engine.advance(), [engine]);
  const prev = useCallback(() => void engine.back(), [engine]);
  const skip = useCallback(() => void engine.skip(), [engine]);

  return { running, start, stop, next, prev, skip };
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
