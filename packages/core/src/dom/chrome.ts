import { resolveButtons } from "../buttons";
import { formatProgress } from "../progress";
import type { Rect } from "../rect";
import { resolveScrimPress } from "../scrim";
import type { Theme } from "../theme";
import type { Interaction } from "../types";
import type { Presenter, PresenterState } from "./presenter";
import {
  ensureKeyframes,
  type StyleDeclarations,
  setAttribute,
  setClass,
  setStyle,
  setText,
  syncChildren,
} from "./style";
import type { CardPlacement, ClassNames } from "./types";

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const RING_STYLE_ID = "tourkit-ring-keyframes";
const RING_KEYFRAMES = `@keyframes tourkit-ring-breathe {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.035); }
}`;
const TRACK_WIDTH = 96;

export type ChromeOptions = {
  container?: Element | null | undefined;
  styled?: boolean | undefined;
  classNames?: ClassNames | undefined;
};

export type Chrome = { destroy(): void };

/** `??` would accept an empty title, naming the dialog with nothing. Blank falls through. */
function accessibleName(title: string | undefined, label: string | undefined): string {
  if (title?.trim()) return title;
  if (label?.trim()) return label;
  return "Tour step";
}

function arrowPosition(placement: CardPlacement, size: number): StyleDeclarations | null {
  if (!placement.arrow) return null;
  const offset = -size / 2;
  switch (placement.side) {
    case "bottom":
      return { left: placement.arrow.left, top: offset };
    case "top":
      return { left: placement.arrow.left, bottom: offset };
    case "right":
      return { top: placement.arrow.top, left: offset };
    case "left":
      return { top: placement.arrow.top, right: offset };
    default:
      return null;
  }
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

/**
 * Paints the default overlay, ring, card, arrow and progress as plain DOM from a presenter's state
 * stream. Every class name and `data-tourkit-*` attribute matches what the React renderer emits, so
 * a published theme and the Playwright suite cannot tell the two apart.
 */
export function mountChrome(presenter: Presenter, options: ChromeOptions = {}): Chrome {
  const engine = presenter.engine;
  const styled = options.styled ?? true;
  const classNames = options.classNames ?? {};
  const container = options.container ?? document.body;

  const root = element("div", { "data-tourkit": "root" });
  const shield = element("div", { "data-tourkit": "shield", "aria-hidden": "true" });
  const catcher = element("button", { type: "button", "data-tourkit": "hole-catcher" });
  const backdrop = element("div", { "data-tourkit": "backdrop", "aria-hidden": "true" });
  const ring = element("div", { "data-tourkit": "ring", "aria-hidden": "true" });
  const cardWrap = element("div", {
    "data-tourkit": "card-wrap",
    role: "dialog",
    "aria-modal": "true",
    tabindex: "-1",
  });
  const arrowAnchor = element("div", { "data-tourkit": "arrow-anchor", "aria-hidden": "true" });
  const card = element("div", { "data-tourkit": "card" });
  const cardArrow = element("span", { "data-tourkit": "arrow" });
  const close = element("button", { type: "button", "data-tourkit": "close" });
  const title = element("div", { "data-tourkit": "title" });
  const body = element("div", { "data-tourkit": "body" });
  const footer = element("div", { "data-tourkit": "footer" });
  const actions = element("div");
  const back = element("button", { type: "button", "data-tourkit": "back" });
  const next = element("button", { type: "button", "data-tourkit": "next" });

  shield.className = "tourkit-shield";
  catcher.className = "tourkit-hole-catcher";
  ring.className = "tourkit-ring";
  cardWrap.className = "tourkit-card-wrap";
  close.className = "tourkit-close";
  close.innerHTML = "&times;";
  title.className = "tourkit-title";
  body.className = "tourkit-body";
  footer.className = "tourkit-footer";
  back.className = "tourkit-back";
  next.className = "tourkit-next";

  cardWrap.append(arrowAnchor, card);
  footer.append(actions);

  let progress: HTMLElement | null = null;
  let progressStyle = "";
  let progressTotal = -1;

  const onScrimPress = () => {
    const state = presenter.getState();
    const press = resolveScrimPress(state.theme.scrim.press, state.dismissible);
    if (press === "close") void engine.stop();
    if (press === "next") void engine.advance();
  };

  shield.addEventListener("click", onScrimPress);
  catcher.addEventListener("click", () => void engine.advance());
  close.addEventListener("click", () => void engine.stop());
  back.addEventListener("click", () => void engine.back());
  next.addEventListener("click", () => void engine.advance());

  function renderProgress(index: number, total: number, theme: Theme): HTMLElement | null {
    if (total <= 1) return null;

    const active = theme.progress.activeColor ?? theme.accent;
    const rest = theme.progress.restColor ?? theme.text.body.color;
    const shape = theme.progress.style;

    if (progress && (progressStyle !== shape || progressTotal !== total)) {
      progress.remove();
      progress = null;
    }
    progressStyle = shape;
    progressTotal = total;

    if (shape === "numbers") {
      const host = progress ?? element("span", { "data-tourkit": "progress" });
      setClass(host, "tourkit-progress", "tourkit-progress-numbers");
      setAttribute(host, "aria-hidden", "true");
      setText(host, formatProgress(theme.progress.template, index, total));
      setStyle(
        host,
        styled
          ? {
              color: active,
              fontSize: theme.text.body.fontSize,
              fontWeight: theme.text.body.fontWeight,
              fontVariantNumeric: "tabular-nums",
            }
          : {},
      );
      progress = host;
      return host;
    }

    if (shape === "continuous") {
      const filled = Math.round(TRACK_WIDTH * ((index + 1) / total));
      const host = progress ?? element("span", { "data-tourkit": "progress" });
      if (host.children.length !== 2) {
        host.replaceChildren(
          element("span", { "data-tourkit": "progress-track" }),
          element("span", { "data-tourkit": "progress-fill" }),
        );
      }
      setClass(host, "tourkit-progress", "tourkit-progress-continuous");
      setAttribute(host, "aria-hidden", "true");
      setStyle(
        host,
        styled
          ? {
              display: "inline-block",
              position: "relative",
              width: TRACK_WIDTH,
              height: 6,
              borderRadius: 3,
              overflow: "hidden",
            }
          : {},
      );
      setStyle(
        host.children[0] as HTMLElement,
        styled
          ? { position: "absolute", inset: 0, backgroundColor: rest, opacity: 0.3, borderRadius: 3 }
          : {},
      );
      setStyle(
        host.children[1] as HTMLElement,
        styled
          ? {
              position: "absolute",
              left: 0,
              top: 0,
              width: filled,
              height: 6,
              backgroundColor: active,
              borderRadius: 3,
              transition: `width ${theme.motion.travel}ms ease-out`,
            }
          : {},
      );
      progress = host;
      return host;
    }

    const host = progress ?? element("div", { "data-tourkit": "progress" });
    if (host.children.length !== total) {
      host.replaceChildren(
        ...Array.from({ length: total }, () => element("span", { "data-tourkit": "progress-dot" })),
      );
    }
    setClass(host, "tourkit-progress", `tourkit-progress-${shape}`);
    setAttribute(host, "aria-hidden", "true");
    setStyle(host, styled ? { display: "flex", alignItems: "center", gap: 5 } : {});

    [...host.children].forEach((dot, position) => {
      const done = position <= index;
      const isActive = shape === "segmented" && position === index;
      setClass(dot, "tourkit-progress-step");
      setAttribute(dot, "data-tourkit-done", done ? "true" : "false");
      setAttribute(dot, "data-tourkit-active", isActive ? "true" : "false");
      setStyle(
        dot as HTMLElement,
        styled
          ? {
              width: isActive ? 22 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: done ? active : rest,
              opacity: done ? 1 : 0.3,
              transition: `width ${theme.motion.travel}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }
          : {},
      );
    });

    progress = host;
    return host;
  }

  function renderCard(state: PresenterState): void {
    const step = state.step;
    if (!step) return;
    const theme = state.theme;
    const buttons = resolveButtons(step, state.dismissible);
    const isFirst = state.stepIndex === 0;
    const isLast = state.stepIndex === state.total - 1;
    const position = theme.arrow.show ? arrowPosition(state.placement, theme.arrow.size) : null;

    const actionStyle: StyleDeclarations = styled
      ? {
          fontSize: theme.text.action.fontSize,
          fontWeight: theme.text.action.fontWeight,
          color: theme.accent,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }
      : {};

    setClass(card, "tourkit-card", classNames.card);
    setAttribute(card, "data-tourkit-placement", state.placement.side);
    setStyle(
      card,
      styled
        ? {
            position: "relative",
            backgroundColor: theme.card.background,
            borderRadius: theme.card.radius,
            padding: theme.card.padding,
            boxShadow:
              theme.card.shadow === "lifted" ? "0 4px 10px rgba(17, 24, 39, 0.15)" : undefined,
          }
        : { position: "relative" },
    );

    if (position) {
      setClass(cardArrow, "tourkit-arrow", classNames.arrow);
      setStyle(cardArrow, {
        position: "absolute",
        width: theme.arrow.size,
        height: theme.arrow.size,
        transform: "rotate(45deg)",
        ...position,
        ...(styled ? { backgroundColor: theme.card.background, borderRadius: 3 } : {}),
      });
    }

    if (buttons.close) {
      setAttribute(close, "aria-label", buttons.closeLabel);
      setStyle(
        close,
        styled
          ? {
              position: "absolute",
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              lineHeight: 1,
              color: theme.text.body.color,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }
          : { position: "absolute", top: 0, right: 0 },
      );
    }

    if (step.title) {
      setText(title, step.title);
      setStyle(
        title,
        styled
          ? {
              fontSize: theme.text.title.fontSize,
              fontWeight: theme.text.title.fontWeight,
              color: theme.text.title.color,
            }
          : {},
      );
    }
    if (step.body) {
      setText(body, step.body);
      setStyle(
        body,
        styled
          ? {
              fontSize: theme.text.body.fontSize,
              fontWeight: theme.text.body.fontWeight,
              color: theme.text.body.color,
              marginTop: 4,
            }
          : {},
      );
    }

    setStyle(
      footer,
      styled
        ? {
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }
        : {},
    );
    setStyle(actions, styled ? { display: "flex", alignItems: "center", gap: 12 } : {});

    if (buttons.back) {
      const disabled = isFirst || buttons.backDisabled;
      back.disabled = disabled;
      setText(back, buttons.backLabel);
      setStyle(
        back,
        styled ? { ...actionStyle, color: theme.text.body.color, opacity: disabled ? 0.4 : 1 } : {},
      );
    }
    if (buttons.next) {
      next.disabled = buttons.nextDisabled;
      setText(next, buttons.advanceLabel(isLast));
      setStyle(
        next,
        styled && buttons.nextDisabled ? { ...actionStyle, opacity: 0.4 } : actionStyle,
      );
    }

    const progressNode = renderProgress(state.stepIndex, state.total, theme);
    syncChildren(footer, [progressNode, actions]);
    syncChildren(actions, [buttons.back ? back : null, buttons.next ? next : null]);
    syncChildren(card, [
      position ? cardArrow : null,
      buttons.close ? close : null,
      step.title ? title : null,
      step.body ? body : null,
      footer,
    ]);
  }

  function render(state: PresenterState): void {
    const running = state.status !== "idle";
    const step = state.step;
    if (!running || !step) {
      root.remove();
      presenter.setAnchors(null, null);
      return;
    }

    const theme = state.theme;
    const active = state.status === "active";
    const interaction: Interaction = step.interaction ?? "block";
    const scrimPress = resolveScrimPress(theme.scrim.press, state.dismissible);

    const holePadding = step.padding ?? theme.spotlight.padding;
    const holeBox: Rect | null = state.rect
      ? {
          x: state.rect.x - holePadding,
          y: state.rect.y - holePadding,
          width: state.rect.width + holePadding * 2,
          height: state.rect.height + holePadding * 2,
        }
      : null;
    const holeRadius =
      typeof step.radius === "number"
        ? step.radius
        : typeof theme.spotlight.radius === "number"
          ? theme.spotlight.radius
          : 8;

    const transition = state.animating ? `clip-path ${theme.motion.morph}ms ${EASING}` : "none";
    const cardTransition = state.animating
      ? `left ${theme.motion.travel}ms ${EASING}, top ${theme.motion.travel}ms ${EASING}`
      : "none";

    setClass(root, "tourkit-root", classNames.root);
    setAttribute(root, "data-tourkit-state", active ? "active" : "resolving");
    setAttribute(root, "data-tourkit-interaction", interaction);
    setStyle(root, {
      position: "fixed",
      inset: 0,
      zIndex: theme.zIndex,
      pointerEvents: "none",
    });

    const showShield = interaction !== "passthrough";
    if (showShield) {
      setStyle(shield, {
        position: "fixed",
        inset: 0,
        pointerEvents: "auto",
        cursor: scrimPress === "none" ? undefined : "pointer",
      });
    }

    const showCatcher = interaction === "advance-on-press" && holeBox !== null;
    if (showCatcher && holeBox) {
      setAttribute(
        catcher,
        "aria-label",
        step.title ? `Continue: ${step.title}` : "Continue the tour",
      );
      setStyle(catcher, {
        position: "fixed",
        left: holeBox.x,
        top: holeBox.y,
        width: holeBox.width,
        height: holeBox.height,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        pointerEvents: "auto",
      });
    }

    setClass(backdrop, "tourkit-overlay", classNames.overlay);
    setStyle(backdrop, {
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      clipPath: state.clipPath,
      transition,
      ...(styled ? { backgroundColor: theme.scrim.color, opacity: theme.scrim.opacity } : {}),
      ...(theme.blur.enabled
        ? {
            backdropFilter: `blur(${theme.blur.radius}px)`,
            WebkitBackdropFilter: `blur(${theme.blur.radius}px)`,
          }
        : {}),
    });

    const showRing = theme.ring.show && holeBox !== null && !state.reduceMotion;
    if (showRing && holeBox) {
      ensureKeyframes(RING_STYLE_ID, RING_KEYFRAMES);
      const width = theme.ring.width;
      setStyle(ring, {
        position: "fixed",
        left: holeBox.x - width,
        top: holeBox.y - width,
        width: holeBox.width + width * 2,
        height: holeBox.height + width * 2,
        borderRadius: holeRadius + width,
        border: `${width}px solid ${theme.ring.color ?? theme.accent}`,
        pointerEvents: "none",
        animation: `tourkit-ring-breathe ${theme.ring.period}ms ease-in-out infinite`,
      });
    }

    setAttribute(cardWrap, "data-tourkit-placement", state.placement.side);
    setAttribute(cardWrap, "aria-label", accessibleName(step.title, step.label));
    setStyle(cardWrap, {
      position: "fixed",
      left: state.placement.side === "center" ? "50%" : state.placement.left,
      top: state.placement.side === "center" ? "50%" : state.placement.top,
      transform: state.placement.side === "center" ? "translate(-50%, -50%)" : undefined,
      maxWidth: theme.card.maxWidth,
      width: "max-content",
      transition: cardTransition,
      visibility: active ? "visible" : "hidden",
      pointerEvents: "auto",
    });
    setStyle(arrowAnchor, {
      position: "absolute",
      width: theme.arrow.size,
      height: theme.arrow.size,
      visibility: "hidden",
    });

    renderCard(state);

    syncChildren(root, [
      showShield ? shield : null,
      showCatcher ? catcher : null,
      backdrop,
      showRing ? ring : null,
      cardWrap,
    ]);

    if (!root.isConnected) container.appendChild(root);
    presenter.setAnchors(cardWrap, arrowAnchor);
  }

  const unsubscribe = presenter.subscribe(render);
  render(presenter.getState());

  return {
    destroy() {
      unsubscribe();
      presenter.setAnchors(null, null);
      root.remove();
    },
  };
}
