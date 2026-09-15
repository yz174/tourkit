import { resolveScrimPress } from "@tourkit/core";
import { createPresenter } from "@tourkit/core/dom";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useEngine, useTourContext } from "./context";
import { useTour } from "./hooks";
import { Ring } from "./ui/Ring";

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

/** `??` would accept an empty title, naming the dialog with nothing. Blank falls through. */
function accessibleName(title: string | undefined, label: string | undefined): string {
  if (title?.trim()) return title;
  if (label?.trim()) return label;
  return "Tour step";
}

const useAnchorEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Renders React's own chrome from the presenter's state stream. The resolving, scrolling, measuring
 * and placing all happen in @tourkit/core/dom, so a Vue or plain-HTML page gets the same behaviour
 * from `mountTour`; only the slot components below are React's.
 */
export function TourHost() {
  const { components, registry, container, styled, classNames, scrollHandler } = useTourContext();
  const engine = useEngine();
  const { next, prev, skip, stop } = useTour();

  const [presenter] = useState(() => createPresenter(engine, { registry, scrollHandler }));
  const state = useSyncExternalStore(presenter.subscribe, presenter.getState, presenter.getState);

  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);

  // No destroy() here: the presenter puts its listeners up on the first subscriber and takes them
  // down with the last, so useSyncExternalStore's own cleanup is the whole teardown.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    presenter.setOptions({ scrollHandler });
  }, [presenter, scrollHandler]);

  // The card and the arrow anchor are React's nodes, so the presenter only learns about them once
  // they are committed. Every render reports them; setAnchors ignores a repeat.
  useAnchorEffect(() => {
    presenter.setAnchors(cardRef.current, arrowRef.current);
  });

  const { status, step, stepIndex, total, theme, dismissible, rect, placement, clipPath } = state;
  const running = status !== "idle";
  const active = status === "active";

  if (!mounted || !running || !step) return null;

  const { Card, Backdrop } = components;
  const scrimPress = resolveScrimPress(theme.scrim.press, dismissible);
  const onScrimPress = scrimPress === "close" ? stop : scrimPress === "next" ? next : undefined;
  const interaction = step.interaction ?? "block";
  const holePadding = step.padding ?? theme.spotlight.padding;
  const holeBox = rect
    ? {
        x: rect.x - holePadding,
        y: rect.y - holePadding,
        width: rect.width + holePadding * 2,
        height: rect.height + holePadding * 2,
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

  const tree = (
    <div
      className={["tourkit-root", classNames.root].filter(Boolean).join(" ")}
      data-tourkit="root"
      data-tourkit-state={active ? "active" : "resolving"}
      data-tourkit-interaction={interaction}
      style={{ position: "fixed", inset: 0, zIndex: theme.zIndex, pointerEvents: "none" }}
    >
      {interaction === "passthrough" ? null : (
        <div
          className="tourkit-shield"
          data-tourkit="shield"
          aria-hidden="true"
          onClick={onScrimPress}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "auto",
            cursor: scrimPress === "none" ? undefined : "pointer",
          }}
        />
      )}
      {interaction === "advance-on-press" && holeBox ? (
        <button
          type="button"
          className="tourkit-hole-catcher"
          data-tourkit="hole-catcher"
          aria-label={step.title ? `Continue: ${step.title}` : "Continue the tour"}
          onClick={next}
          style={{
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
          }}
        />
      ) : null}
      <Backdrop
        clipPath={clipPath}
        transition={transition}
        theme={theme}
        styled={styled}
        className={classNames.overlay}
      />
      {theme.ring.show && holeBox && !state.reduceMotion ? (
        <Ring hole={holeBox} radius={holeRadius} theme={theme} />
      ) : null}
      <div
        ref={cardRef}
        className="tourkit-card-wrap"
        data-tourkit="card-wrap"
        data-tourkit-placement={placement.side}
        role="dialog"
        aria-modal="true"
        aria-label={accessibleName(step.title, step.label)}
        tabIndex={-1}
        style={{
          position: "fixed",
          left: placement.side === "center" ? "50%" : placement.left,
          top: placement.side === "center" ? "50%" : placement.top,
          transform: placement.side === "center" ? "translate(-50%, -50%)" : undefined,
          maxWidth: theme.card.maxWidth,
          width: "max-content",
          transition: cardTransition,
          visibility: active ? "visible" : "hidden",
          pointerEvents: "auto",
        }}
      >
        <div
          ref={arrowRef}
          data-tourkit="arrow-anchor"
          aria-hidden="true"
          style={{
            position: "absolute",
            width: theme.arrow.size,
            height: theme.arrow.size,
            visibility: "hidden",
          }}
        />
        <Card
          step={step}
          index={stepIndex}
          total={total}
          rect={rect}
          placement={placement}
          theme={theme}
          styled={styled}
          classNames={classNames}
          isFirst={stepIndex === 0}
          isLast={stepIndex === total - 1}
          dismissible={dismissible}
          next={next}
          prev={prev}
          skip={skip}
          stop={stop}
        />
      </div>
    </div>
  );

  return createPortal(tree, container ?? document.body);
}
