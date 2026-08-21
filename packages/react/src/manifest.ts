import type { TargetDescriptor, TargetManifest } from "@tourkit/core";

function labelFor(element: Element): string | undefined {
  const explicit = element.getAttribute("data-tour-label");
  if (explicit) return explicit;
  const aria = element.getAttribute("aria-label");
  if (aria) return aria;
  const text = element.textContent?.trim().replace(/\s+/g, " ");
  if (text) return text.slice(0, 120);
  const title = element.getAttribute("title");
  return title ?? undefined;
}

function describe(id: string, element: Element, route: string): TargetDescriptor {
  const label = labelFor(element);
  return {
    id,
    ...(label ? { label } : {}),
    ...(route ? { route } : {}),
  };
}

export function buildManifest(registry: Map<string, Element>, route = ""): TargetManifest {
  const seen = new Map<string, TargetDescriptor>();

  for (const [id, element] of registry) {
    if (element.isConnected) seen.set(id, describe(id, element, route));
  }

  if (typeof document !== "undefined") {
    for (const element of document.querySelectorAll("[data-tour-id]")) {
      const id = element.getAttribute("data-tour-id");
      if (id && !seen.has(id)) seen.set(id, describe(id, element, route));
    }
  }

  return [...seen.values()];
}
