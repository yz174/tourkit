import type { Fingerprint } from "../types";
import { buildFingerprint } from "./fingerprint";

export type RecordedStep = {
  target: string;
  registered: boolean;
  tag: string;
  label?: string;
  role?: string;
  text?: string;
  route?: string;
  fingerprint?: Fingerprint;
};

export type Recording = {
  name: string;
  createdAt: number;
  steps: RecordedStep[];
};

const STABLE_ID = /^[a-zA-Z][\w-]*$/;

function isUnique(selector: string, root: Document): boolean {
  try {
    return root.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

const SEMANTIC_CLASS = /^[a-zA-Z][a-zA-Z-]{1,38}$/;

function stableClass(element: Element): string | null {
  return Array.from(element.classList).find((name) => SEMANTIC_CLASS.test(name)) ?? null;
}

function segment(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  if (!parent) return tag;

  const siblings = Array.from(parent.children).filter((child) => child.tagName === element.tagName);
  if (siblings.length === 1) return tag;
  return `${tag}:nth-of-type(${siblings.indexOf(element) + 1})`;
}

export function cssPath(element: Element, root: Document = document): string {
  const testId = element.getAttribute("data-testid");
  if (testId && isUnique(`[data-testid="${testId}"]`, root)) return `[data-testid="${testId}"]`;

  if (element.id && STABLE_ID.test(element.id) && isUnique(`#${element.id}`, root)) {
    return `#${element.id}`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== root.documentElement && parts.length < 6) {
    const className = stableClass(current);
    const own = className ? `${segment(current)}.${className}` : segment(current);
    parts.unshift(own);
    const candidate = parts.join(" > ");
    if (isUnique(candidate, root)) return candidate;
    current = current.parentElement;
  }

  return parts.join(" > ");
}

export function textOf(element: Element): string | undefined {
  const text = element.textContent?.trim().replace(/\s+/g, " ");
  if (!text) return undefined;
  return text.slice(0, 120);
}

/**
 * The id an element was registered under with useTourTarget, if any. The innermost registered
 * ancestor wins, so a registered row inside a registered list records as the row rather than
 * as whichever of the two was registered first.
 */
function registeredId(element: Element, registry?: Map<string, Element>): string | null {
  if (!registry) return null;

  let bestId: string | null = null;
  let bestNode: Element | null = null;

  for (const [id, node] of registry) {
    if (node === element) return id;
    if (!node.contains(element)) continue;
    if (bestNode === null || bestNode.contains(node)) {
      bestId = id;
      bestNode = node;
    }
  }

  return bestId;
}

export function describeElement(
  element: Element,
  route = "",
  registry?: Map<string, Element>,
): RecordedStep {
  const tourId = element.getAttribute("data-tour-id") ?? registeredId(element, registry);
  const label = element.getAttribute("data-tour-label") ?? element.getAttribute("aria-label");
  const role = element.getAttribute("role") ?? undefined;
  const text = textOf(element);

  return {
    target: tourId ?? cssPath(element),
    registered: Boolean(tourId),
    tag: element.tagName.toLowerCase(),
    ...(label ? { label } : {}),
    ...(role ? { role } : {}),
    ...(text ? { text } : {}),
    ...(route ? { route } : {}),
    fingerprint: buildFingerprint(element),
  };
}
