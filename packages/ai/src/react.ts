import type { TargetManifest, TourConfig } from "@tourkit/core";
import { useCallback, useMemo, useRef, useState } from "react";
import { askTourkit, cacheKey } from "./client";
import type { ValidationFailure } from "./validate";

export type AskStatus = "idle" | "asking" | "ready" | "failed";

export type UseTourkitAskOptions = {
  endpoint: string;
  getManifest: () => TargetManifest;
  onTour?: (tour: TourConfig<unknown>) => void;
  fetchImpl?: typeof fetch;
};

export function useTourkitAsk({ endpoint, getManifest, onTour, fetchImpl }: UseTourkitAskOptions) {
  const [status, setStatus] = useState<AskStatus>("idle");
  const [tour, setTour] = useState<TourConfig<unknown> | null>(null);
  const [error, setError] = useState<ValidationFailure | null>(null);
  const cache = useRef(new Map<string, TourConfig<unknown>>());
  const pending = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    setStatus("idle");
    setTour(null);
    setError(null);
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const manifest = getManifest();
      const key = cacheKey(question, manifest);
      const cached = cache.current.get(key);
      if (cached) {
        setTour(cached);
        setError(null);
        setStatus("ready");
        onTour?.(cached);
        return;
      }

      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      setStatus("asking");
      setError(null);

      const result = await askTourkit({
        endpoint,
        question,
        manifest,
        signal: controller.signal,
        ...(fetchImpl ? { fetchImpl } : {}),
      });

      if (controller.signal.aborted) return;
      pending.current = null;

      if (!result.ok) {
        setError(result);
        setTour(null);
        setStatus("failed");
        return;
      }

      cache.current.set(key, result.tour);
      setTour(result.tour);
      setStatus("ready");
      onTour?.(result.tour);
    },
    [endpoint, getManifest, onTour, fetchImpl],
  );

  return useMemo(() => ({ ask, reset, status, tour, error }), [ask, reset, status, tour, error]);
}
