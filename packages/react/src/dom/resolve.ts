import type { Placement as FloatingPlacement } from "@floating-ui/dom";
import type { Placement } from "@tourkit/core";

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

export function scrollIntoViewIfNeeded(element: Element, behavior: ScrollBehavior): void {
  const rect = element.getBoundingClientRect();
  const visible =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth;
  if (visible) return;
  element.scrollIntoView({ block: "center", inline: "center", behavior });
}
