export type ScrimPress = "none" | "close" | "next";

/**
 * What pressing the dimmed area should do, after checking the step is allowed to be dismissed.
 * `close` is an exit, so a step with `dismissible: false` falls back to doing nothing.
 * `next` is not an exit, so it is allowed either way.
 */
export function resolveScrimPress(press: ScrimPress | undefined, dismissible: boolean): ScrimPress {
  const resolved = press ?? "none";
  if (resolved === "close" && !dismissible) return "none";
  return resolved;
}
