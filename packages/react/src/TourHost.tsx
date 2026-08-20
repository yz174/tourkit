import { arrow, autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { nextFocusTarget } from "./a11y/focus";
import { useEngine, useTourContext } from "./context";
import { holeClipPath } from "./dom/clip";
import { resolveTarget, scrollIntoViewIfNeeded, toFloatingPlacement } from "./dom/resolve";
import { useTour, useTourSnapshot } from "./hooks";
import type { CardPlacement } from "./types";

const CENTERED: CardPlacement = { left: 0, top: 0, side: "center", arrow: null };
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TourHost() {
  const { components, registry, container, styled } = useTourContext();
  const engine = useEngine();
  const snapshot = useTourSnapshot();
  const { next, prev, skip, stop } = useTour();

  const [mounted, setMounted] = useState(false);
  const [element, setElement] = useState<Element | null>(null);
  const [positioned, setPositioned] = useState<CardPlacement>(CENTERED);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const cardRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const lastTarget = useRef<string | null>(null);
  const placedOnce = useRef(false);

  const { status, step, stepIndex, total, theme } = snapshot;
  const running = status !== "idle";
  const active = status === "active";
  const target = step?.target ?? null;
  const rect = target ? (snapshot.rects[target] ?? null) : null;
  const placement = target ? positioned : CENTERED;

  useEffect(() => {
    const measureViewport = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    measureViewport();
    window.addEventListener("resize", measureViewport);
    window.visualViewport?.addEventListener("resize", measureViewport);
    return () => {
      window.removeEventListener("resize", measureViewport);
      window.visualViewport?.removeEventListener("resize", measureViewport);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    setReduceMotion(prefersReducedMotion());
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!running || !target) {
      setElement(null);
      return;
    }
    const find = () => {
      const found = resolveTarget(target, registry);
      if (found) setElement((current) => (current === found ? current : found));
      return found;
    };
    if (find()) return;
    const observer = new MutationObserver(() => {
      if (find()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [running, target, registry]);

  useEffect(() => {
    if (!element || step?.scroll === false) return;
    scrollIntoViewIfNeeded(element, reduceMotion ? "auto" : "smooth");
  }, [element, step, reduceMotion]);

  const reposition = useCallback(async () => {
    if (!element || !target) return;
    const box = element.getBoundingClientRect();
    engine.setRect(target, { x: box.x, y: box.y, width: box.width, height: box.height });

    const card = cardRef.current;
    if (!card) return;

    const middleware = [offset(14), flip(), shift({ padding: 16 })];
    if (arrowRef.current) middleware.push(arrow({ element: arrowRef.current, padding: 12 }));

    const result = await computePosition(element, card, {
      strategy: "fixed",
      placement: toFloatingPlacement(step?.placement ?? "auto"),
      middleware,
    });

    const data = result.middlewareData.arrow;
    setPositioned({
      left: Math.round(result.x),
      top: Math.round(result.y),
      side: result.placement.split("-")[0] as CardPlacement["side"],
      arrow: data ? { left: Math.round(data.x ?? 0), top: Math.round(data.y ?? 0) } : null,
    });
  }, [element, target, engine, step]);

  useEffect(() => {
    if (!element || !cardRef.current) return;
    void reposition();
    return autoUpdate(element, cardRef.current, () => void reposition());
  }, [element, reposition]);

  useEffect(() => {
    if (!running) {
      placedOnce.current = false;
      lastTarget.current = null;
      setAnimating(false);
    }
  }, [running]);

  useEffect(() => {
    if (!active) return;
    if (lastTarget.current === target) return;
    const wasPlaced = placedOnce.current;
    lastTarget.current = target;
    placedOnce.current = true;
    if (!wasPlaced || reduceMotion) return;
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), theme.motion.morph);
    return () => clearTimeout(timer);
  }, [active, target, reduceMotion, theme.motion.morph]);

  useEffect(() => {
    const stepId = step?.id;
    if (!active || !stepId) return;
    const card = cardRef.current;
    if (!card) return;
    const focusable = card.querySelector<HTMLElement>("button, [href], input, [tabindex='0']");
    (focusable ?? card).focus({ preventScroll: true });
  }, [active, step?.id]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        stop();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
        return;
      }
      const card = cardRef.current;
      if (event.key === "Tab" && card) {
        const destination = nextFocusTarget(card, document.activeElement, event.shiftKey);
        if (destination) {
          event.preventDefault();
          destination.focus({ preventScroll: true });
        }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [active, next, prev, stop]);

  const clipPath = useMemo(() => {
    const vw = viewport.width;
    const vh = viewport.height;
    if (vw === 0 || vh === 0) return "none";
    if (!rect) return holeClipPath(vw, vh, vw / 2, vh / 2, 0, 0, 0);

    const padding = step?.padding ?? theme.spotlight.padding;
    const base =
      typeof step?.radius === "number"
        ? step.radius
        : typeof theme.spotlight.radius === "number"
          ? theme.spotlight.radius
          : 8;

    return holeClipPath(
      vw,
      vh,
      rect.x - padding,
      rect.y - padding,
      rect.width + padding * 2,
      rect.height + padding * 2,
      base + padding,
    );
  }, [rect, step, theme, viewport]);

  if (!mounted || !running || !step) return null;

  const { Card, Backdrop } = components;
  const transition = animating ? `clip-path ${theme.motion.morph}ms ${EASING}` : "none";
  const cardTransition = animating
    ? `left ${theme.motion.travel}ms ${EASING}, top ${theme.motion.travel}ms ${EASING}`
    : "none";

  const tree = (
    <div data-tourkit="root" data-tourkit-state={active ? "active" : "resolving"}>
      <div
        data-tourkit="shield"
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, pointerEvents: "auto" }}
      />
      <Backdrop clipPath={clipPath} transition={transition} theme={theme} styled={styled} />
      <div
        ref={cardRef}
        data-tourkit="card-wrap"
        data-tourkit-placement={placement.side}
        role="dialog"
        aria-modal="true"
        aria-label={step.title ?? "Tour step"}
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
          isFirst={stepIndex === 0}
          isLast={stepIndex === total - 1}
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
