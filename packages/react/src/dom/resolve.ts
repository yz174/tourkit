import type { Placement as FloatingPlacement } from "@floating-ui/dom";
import type { Fingerprint, Placement, ScrollOptions } from "@tourkit/core";
import { healTarget } from "./fingerprint";

export function resolveTarget(target: string, registry: Map<string, Element>): Element | null {
  const registered = registry.get(target);
  if (registered?.isConnected) return registered;

  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(target) : target;
  const byAttribute = document.querySelector(`[data-tour-id="${escaped}"]`);
  if (byAttribute) return byAttribute;

  try {
    return document.querySelector(target);
  } catch {
    return null;
  }
}

export type Resolution = { element: Element | null; healed: boolean };

export function resolveWithFingerprint(
  target: string,
  registry: Map<string, Element>,
  fingerprint?: Fingerprint,
): Resolution {
  const direct = resolveTarget(target, registry);
  if (direct) return { element: direct, healed: false };
  if (!fingerprint) return { element: null, healed: false };

  const healed = healTarget(fingerprint);
  return healed ? { element: healed, healed: true } : { element: null, healed: false };
}

export function toFloatingPlacement(placement: Placement): FloatingPlacement {
  switch (placement) {
    case "top":
      return "top";
    case "left":
      return "left";
    case "right":
      return "right";
    default:
      return "bottom";
  }
}

export function scrollSettings(scroll: boolean | ScrollOptions | undefined): {
  enabled: boolean;
  block: ScrollLogicalPosition;
  behavior: ScrollBehavior;
} {
  if (scroll === false) return { enabled: false, block: "center", behavior: "smooth" };
  if (scroll === true || scroll === undefined) {
    return { enabled: true, block: "center", behavior: "smooth" };
  }
  return {
    enabled: true,
    block: scroll.block ?? "center",
    behavior: scroll.behavior ?? "smooth",
  };
}

export function scrollIntoViewIfNeeded(
  element: Element,
  block: ScrollLogicalPosition,
  behavior: ScrollBehavior,
): void {
  const rect = element.getBoundingClientRect();
  const visible =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth;
  if (visible) return;
  element.scrollIntoView({ block, inline: "center", behavior });
}
