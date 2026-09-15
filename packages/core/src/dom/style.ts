/** Properties a bare number must not be given a `px` suffix on. */
const UNITLESS = new Set(["opacity", "zIndex", "fontWeight", "lineHeight", "flexGrow", "order"]);

export type StyleDeclarations = Record<string, string | number | undefined>;

function toKebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Applies a React-style declaration object to an element, numbers included, and clears whatever
 * was there before so a removed declaration does not linger across renders.
 */
export function setStyle(element: HTMLElement, declarations: StyleDeclarations): void {
  element.style.cssText = "";
  for (const [name, value] of Object.entries(declarations)) {
    if (value === undefined || value === "") continue;
    const property = name.startsWith("Webkit")
      ? `-webkit-${toKebab(name.slice(6))}`
      : toKebab(name);
    const text = typeof value === "number" && !UNITLESS.has(name) ? `${value}px` : String(value);
    element.style.setProperty(property, text);
  }
}

export function setAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
    return;
  }
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

export function setClass(element: Element, ...names: (string | undefined)[]): void {
  const value = names.filter(Boolean).join(" ");
  if (element.className !== value) element.className = value;
}

export function setText(element: Element, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}

/** Keeps `parent` holding exactly `children`, in this order. Nulls are the absent ones. */
export function syncChildren(parent: Element, children: (Element | null)[]): void {
  const wanted = children.filter((child): child is Element => child !== null);
  for (const node of [...parent.children]) {
    if (!wanted.includes(node)) node.remove();
  }
  wanted.forEach((node, index) => {
    if (parent.children[index] !== node) parent.insertBefore(node, parent.children[index] ?? null);
  });
}

/** Injects a keyframes block once per document, the way the React components do on mount. */
export function ensureKeyframes(id: string, css: string): void {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const element = document.createElement("style");
  element.id = id;
  element.textContent = css;
  document.head.appendChild(element);
}
