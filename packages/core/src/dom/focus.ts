const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getAttribute("aria-hidden") !== "true",
  );
}

export function nextFocusTarget(
  container: HTMLElement,
  active: Element | null,
  backwards: boolean,
): HTMLElement | null {
  const items = focusableWithin(container);
  if (items.length === 0) return null;

  const first = items[0] as HTMLElement;
  const last = items[items.length - 1] as HTMLElement;
  const index = active instanceof HTMLElement ? items.indexOf(active) : -1;

  if (index === -1) return backwards ? last : first;
  if (backwards) return index === 0 ? last : (items[index - 1] as HTMLElement);
  return index === items.length - 1 ? first : (items[index + 1] as HTMLElement);
}
