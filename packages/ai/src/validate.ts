import type { TargetManifest, TourConfig } from "@tourkit/core";
import { generatedTourSchema } from "./schema";

export type ValidationFailure = {
  ok: false;
  reason: "malformed" | "unknown-target" | "empty";
  detail: string;
};

export type ValidationSuccess = { ok: true; tour: TourConfig<unknown> };

export type ValidationResult = ValidationSuccess | ValidationFailure;

export const GENERATED_TOUR_ID = "tourkit-generated";

export function validateGenerated(
  raw: unknown,
  manifest: TargetManifest,
  tourId: string = GENERATED_TOUR_ID,
): ValidationResult {
  const parsed = generatedTourSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "malformed", detail: parsed.error.issues[0]?.message ?? "invalid" };
  }

  const known = new Set(manifest.map((entry) => entry.id));
  const steps: TourConfig<unknown>["steps"] = [];
  let previousTarget: string | null | undefined;

  for (const [index, step] of parsed.data.steps.entries()) {
    if (step.target !== null && !known.has(step.target)) {
      return {
        ok: false,
        reason: "unknown-target",
        detail: `step ${index + 1} names "${step.target}", which is not a registered target`,
      };
    }
    if (step.target !== null && step.target === previousTarget) continue;
    previousTarget = step.target;
    steps.push({
      id: `generated-${index + 1}`,
      target: step.target,
      title: step.title,
      ...(step.body ? { body: step.body } : {}),
    });
  }

  if (steps.length === 0) {
    return { ok: false, reason: "empty", detail: "the model returned no usable steps" };
  }

  return { ok: true, tour: { id: tourId, version: 1, steps } };
}
