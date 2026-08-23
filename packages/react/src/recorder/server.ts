import { useEffect, useState } from "react";

export const DEFAULT_ENDPOINT = "http://127.0.0.1:5178/record";

export function statusUrl(endpoint: string): string {
  try {
    return new URL("/status", endpoint).toString();
  } catch {
    return DEFAULT_ENDPOINT.replace("/record", "/status");
  }
}

export type ServerState = { online: boolean; outDir: string | null };

const OFFLINE: ServerState = { online: false, outDir: null };

export function useRecordServer(
  endpoint: string,
  enabled: boolean,
  intervalMs = 2000,
): ServerState {
  const [state, setState] = useState<ServerState>(OFFLINE);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const url = statusUrl(endpoint);

    const ping = async () => {
      try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) throw new Error("not ok");
        const body = (await response.json()) as { ok?: boolean; outDir?: string };
        if (cancelled) return;
        setState(body?.ok ? { online: true, outDir: body.outDir ?? null } : OFFLINE);
      } catch {
        if (!cancelled) setState(OFFLINE);
      }
    };

    void ping();
    const timer = setInterval(() => void ping(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [endpoint, enabled, intervalMs]);

  return state;
}
