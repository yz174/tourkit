const shared = new Map<string, Element>();

/** The registry `mountTour` reads when no other one is passed. */
export function targetRegistry(): Map<string, Element> {
  return shared;
}

/**
 * Registers an element under a tour target id, the plain-DOM equivalent of `useTourTarget`.
 * Call the returned function when the element goes away.
 */
export function registerTarget(id: string, element: Element): () => void {
  shared.set(id, element);
  return () => {
    if (shared.get(id) === element) shared.delete(id);
  };
}
