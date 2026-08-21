import type { Fingerprint } from "@tourkit/core";

const MAX_CANDIDATES = 500;
const MIN_SCORE = 4;

const WEIGHTS = { label: 5, text: 4, role: 2, near: 2, index: 1 };

function normalize(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, 120) : undefined;
}

function positionOf(element: Element): number | undefined {
  const parent = element.parentElement;
  if (!parent) return undefined;
  const siblings = [...parent.children].filter((child) => child.tagName === element.tagName);
  if (siblings.length < 2) return undefined;
  return siblings.indexOf(element) + 1;
}

export function nearestHeading(element: Element): string | undefined {
  let current: Element | null = element;

  while (current) {
    let sibling: Element | null = current.previousElementSibling;
    while (sibling) {
      if (/^H[1-6]$/.test(sibling.tagName)) return normalize(sibling.textContent);
      const nested = sibling.querySelector("h1, h2, h3, h4, h5, h6");
      if (nested) return normalize(nested.textContent);
      sibling = sibling.previousElementSibling;
    }
    current = current.parentElement;
    const label = current?.getAttribute("aria-label");
    if (label) return normalize(label);
  }

  return undefined;
}

export function buildFingerprint(element: Element): Fingerprint {
  const label =
    normalize(element.getAttribute("data-tour-label")) ??
    normalize(element.getAttribute("aria-label"));

  return {
    tag: element.tagName.toLowerCase(),
    ...(normalize(element.textContent) ? { text: normalize(element.textContent) } : {}),
    ...(element.getAttribute("role") ? { role: element.getAttribute("role") as string } : {}),
    ...(label ? { label } : {}),
    ...(nearestHeading(element) ? { near: nearestHeading(element) } : {}),
    ...(positionOf(element) ? { index: positionOf(element) } : {}),
  };
}

export function scoreCandidate(element: Element, fingerprint: Fingerprint): number {
  if (element.tagName.toLowerCase() !== fingerprint.tag) return 0;

  let score = 0;
  const label =
    normalize(element.getAttribute("data-tour-label")) ??
    normalize(element.getAttribute("aria-label"));

  if (fingerprint.label && label === fingerprint.label) score += WEIGHTS.label;
  if (fingerprint.text && normalize(element.textContent) === fingerprint.text) {
    score += WEIGHTS.text;
  }
  if (fingerprint.role && element.getAttribute("role") === fingerprint.role) {
    score += WEIGHTS.role;
  }
  if (fingerprint.near && nearestHeading(element) === fingerprint.near) score += WEIGHTS.near;
  if (fingerprint.index && positionOf(element) === fingerprint.index) score += WEIGHTS.index;

  return score;
}

export function healTarget(fingerprint: Fingerprint, root: Document = document): Element | null {
  let candidates: Element[];
  try {
    candidates = [...root.querySelectorAll(fingerprint.tag)];
  } catch {
    return null;
  }
  if (candidates.length === 0 || candidates.length > MAX_CANDIDATES) return null;

  let best: Element | null = null;
  let bestScore = 0;
  let runnerUp = 0;

  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, fingerprint);
    if (score > bestScore) {
      runnerUp = bestScore;
      bestScore = score;
      best = candidate;
    } else if (score > runnerUp) {
      runnerUp = score;
    }
  }

  if (bestScore < MIN_SCORE || bestScore === runnerUp) return null;
  return best;
}
