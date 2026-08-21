import type { TargetManifest } from "@tourkit/core";
import { type ValidationResult, validateGenerated } from "./validate";

export type AskOptions = {
  endpoint: string;
  question: string;
  manifest: TargetManifest;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  tourId?: string;
};

export async function askTourkit({
  endpoint,
  question,
  manifest,
  signal,
  fetchImpl,
  tourId,
}: AskOptions): Promise<ValidationResult> {
  const send = fetchImpl ?? globalThis.fetch;
  let response: Response;

  try {
    response = await send(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, manifest }),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    return {
      ok: false,
      reason: "malformed",
      detail: error instanceof Error ? error.message : "request failed",
    };
  }

  if (!response.ok) {
    return { ok: false, reason: "malformed", detail: `endpoint returned ${response.status}` };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, reason: "malformed", detail: "endpoint returned invalid json" };
  }

  return validateGenerated(payload, manifest, tourId);
}

export function cacheKey(question: string, manifest: TargetManifest): string {
  const ids = manifest
    .map((entry) => entry.id)
    .sort()
    .join(",");
  return `${question.trim().toLowerCase()}::${ids}`;
}
