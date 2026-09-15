import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { mergeTheme, type ThemeOverride } from "../theme";
import type { Align, Placement, StorageAdapter } from "../types";
import { targetRegistry } from "./registry";
import { resolveTarget, toFloatingPlacement } from "./resolve";
import { browserStorage } from "./storage";
import { ensureKeyframes, setAttribute, setClass, setStyle, setText } from "./style";

const STYLE_ID = "tourkit-hint-keyframes";
const KEYFRAMES = `@keyframes tourkit-hint-pulse {
  0% { opacity: 0.7; transform: scale(0.7); }
  100% { opacity: 0; transform: scale(1.6); }
}`;

/** One hint at a time, the same rule the React provider enforces through its context. */
const openHints = new Set<() => void>();

export function hintKey(id: string): string {
  return `tourkit:hint:${id}`;
}

export type HintOptions = {
  id: string;
  target: string;
  title?: string | undefined;
  body?: string | undefined;
  placement?: Placement | undefined;
  align?: Align | undefined;
  dismissLabel?: string | undefined;
  theme?: ThemeOverride | undefined;
  className?: string | undefined;
  registry?: Map<string, Element> | undefined;
  container?: Element | null | undefined;
  storage?: StorageAdapter | undefined;
  styled?: boolean | undefined;
};

export type Hint = { destroy(): void };

/** The plain-DOM port of `<TourHint>`: a pulsing dot beside a target that opens a small card. */
export function mountHint(options: HintOptions): Hint {
  const {
    id,
    target,
    title,
    body,
    placement = "bottom",
    align = "center",
    dismissLabel = "Got it",
    className,
  } = options;

  const registry = options.registry ?? targetRegistry();
  const container = options.container ?? document.body;
  const storage = options.storage ?? browserStorage();
  const styled = options.styled ?? true;
  const theme = mergeTheme(options.theme);

  const root = document.createElement("div");
  root.className = "tourkit-hint";
  root.setAttribute("data-tourkit", "hint");
  root.setAttribute("data-tourkit-hint-id", id);

  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("data-tourkit", "hint-dot");
  dot.setAttribute("aria-label", title ? `Hint: ${title}` : "Hint");

  const pulse = document.createElement("span");
  pulse.setAttribute("data-tourkit", "hint-pulse");
  pulse.setAttribute("aria-hidden", "true");
  dot.appendChild(pulse);

  const cardNode = document.createElement("div");
  cardNode.className = "tourkit-hint-card";
  cardNode.setAttribute("data-tourkit", "hint-card");
  cardNode.setAttribute("role", "dialog");
  cardNode.setAttribute("aria-label", title ?? "Hint");

  const titleNode = document.createElement("div");
  titleNode.className = "tourkit-hint-title";
  titleNode.setAttribute("data-tourkit", "hint-title");

  const bodyNode = document.createElement("div");
  bodyNode.className = "tourkit-hint-body";
  bodyNode.setAttribute("data-tourkit", "hint-body");

  const dismissNode = document.createElement("button");
  dismissNode.type = "button";
  dismissNode.className = "tourkit-hint-dismiss";
  dismissNode.setAttribute("data-tourkit", "hint-dismiss");

  let dismissed: boolean | null = null;
  let open = false;
  let dotAt: { left: number; top: number } | null = null;
  let cardAt: { left: number; top: number } | null = null;
  let stopAutoUpdate: (() => void) | null = null;
  let destroyed = false;

  const closeSelf = () => {
    if (!open) return;
    open = false;
    render();
  };

  function place(): void {
    const element = resolveTarget(target, registry);
    if (!element) {
      dotAt = null;
      render();
      return;
    }
    const box = element.getBoundingClientRect();
    dotAt = { left: box.right - 8, top: box.top - 8 };
    render();

    if (!open) return;
    void computePosition(element, cardNode, {
      strategy: "fixed",
      placement: toFloatingPlacement(placement, align),
      middleware: [offset(12), flip(), shift({ padding: 12 })],
    }).then((result) => {
      if (destroyed) return;
      cardAt = { left: Math.round(result.x), top: Math.round(result.y) };
      render();
    });
  }

  function render(): void {
    if (destroyed) return;
    if (dismissed !== false || !dotAt) {
      root.remove();
      return;
    }

    setClass(dot, "tourkit-hint-dot", className);
    setAttribute(dot, "aria-expanded", open ? "true" : "false");
    setStyle(
      dot,
      styled
        ? {
            position: "fixed",
            left: dotAt.left,
            top: dotAt.top,
            width: 16,
            height: 16,
            padding: 0,
            borderRadius: "50%",
            border: "2px solid #ffffff",
            background: theme.accent,
            cursor: "pointer",
            zIndex: theme.zIndex,
          }
        : { position: "fixed", left: dotAt.left, top: dotAt.top },
    );
    setStyle(
      pulse,
      styled
        ? {
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            border: `2px solid ${theme.accent}`,
            animation: "tourkit-hint-pulse 1600ms ease-out infinite",
            pointerEvents: "none",
          }
        : {},
    );

    if (open) {
      setStyle(
        cardNode,
        styled
          ? {
              position: "fixed",
              left: cardAt?.left ?? dotAt.left,
              top: cardAt?.top ?? dotAt.top,
              maxWidth: theme.card.maxWidth,
              width: "max-content",
              background: theme.card.background,
              borderRadius: theme.card.radius,
              padding: theme.card.padding,
              boxShadow:
                theme.card.shadow === "lifted" ? "0 10px 30px -12px rgba(0,0,0,.45)" : "none",
              zIndex: theme.zIndex,
            }
          : {
              position: "fixed",
              left: cardAt?.left ?? dotAt.left,
              top: cardAt?.top ?? dotAt.top,
            },
      );

      const children: Element[] = [];
      if (title) {
        setText(titleNode, title);
        setStyle(
          titleNode,
          styled
            ? {
                fontSize: theme.text.title.fontSize,
                fontWeight: theme.text.title.fontWeight,
                color: theme.text.title.color,
              }
            : {},
        );
        children.push(titleNode);
      }
      if (body) {
        setText(bodyNode, body);
        setStyle(
          bodyNode,
          styled
            ? {
                fontSize: theme.text.body.fontSize,
                fontWeight: theme.text.body.fontWeight,
                color: theme.text.body.color,
                marginTop: 4,
              }
            : {},
        );
        children.push(bodyNode);
      }
      setText(dismissNode, dismissLabel);
      setStyle(
        dismissNode,
        styled
          ? {
              marginTop: 10,
              border: "none",
              background: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: theme.text.action.fontSize,
              fontWeight: theme.text.action.fontWeight,
              color: theme.text.action.color,
            }
          : {},
      );
      children.push(dismissNode);
      cardNode.replaceChildren(...children);
    }

    root.replaceChildren(...(open ? [dot, cardNode] : [dot]));
    if (!root.isConnected) container.appendChild(root);
  }

  dot.addEventListener("click", () => {
    if (open) {
      open = false;
      render();
      return;
    }
    for (const other of openHints) other();
    open = true;
    render();
    place();
  });

  dismissNode.addEventListener("click", () => {
    open = false;
    dismissed = true;
    void storage.set(hintKey(id), "dismissed");
    render();
  });

  openHints.add(closeSelf);
  ensureKeyframes(STYLE_ID, KEYFRAMES);

  storage
    .get(hintKey(id))
    .then((value) => {
      if (destroyed) return;
      dismissed = value === "dismissed";
      if (dismissed) return;
      const element = resolveTarget(target, registry);
      if (!element) return;
      place();
      stopAutoUpdate = autoUpdate(element, dot, place);
    })
    .catch(() => {
      if (!destroyed) dismissed = false;
    });

  return {
    destroy() {
      destroyed = true;
      openHints.delete(closeSelf);
      stopAutoUpdate?.();
      root.remove();
    },
  };
}
