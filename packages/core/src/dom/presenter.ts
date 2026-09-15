import { arrow, autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { padRadius, type Radius } from "../corners";
import type { EngineSnapshot, TourEngine } from "../engine";
import type { Rect } from "../rect";
import type { Theme } from "../theme";
import type { TourStatus, TourStep } from "../types";
import { type Hole, holeClipPath, holesClipPath } from "./clip";
import { nextFocusTarget } from "./focus";
import {
  resolveTarget,
  resolveWithFingerprint,
  scrollIntoViewIfNeeded,
  scrollSettings,
  toFloatingPlacement,
} from "./resolve";
import type { CardPlacement, ScrollHandler } from "./types";

const CENTERED: CardPlacement = { left: 0, top: 0, side: "center", arrow: null };

/** A re-entrant flush always terminates; the cap only stops a pathological loop from hanging. */
const MAX_FLUSH_PASSES = 20;

export type PresenterState = {
  status: TourStatus;
  step: TourStep<unknown> | null;
  stepIndex: number;
  total: number;
  theme: Theme;
  dismissible: boolean;
  element: Element | null;
  rect: Rect | null;
  placement: CardPlacement;
  clipPath: string;
  reduceMotion: boolean;
  /** True while a step change is morphing the cutout, so the renderer can pick a transition. */
  animating: boolean;
};

export type PresenterOptions = {
  /** Elements registered by id, as `useTourTarget` and `registerTarget` fill it. */
  registry?: Map<string, Element> | undefined;
  scrollHandler?: ScrollHandler | undefined;
};

export type Presenter = {
  /** The engine this presenter watches, so a renderer can drive it without being handed it twice. */
  engine: TourEngine<unknown>;
  subscribe(listener: (state: PresenterState) => void): () => void;
  getState(): PresenterState;
  /**
   * Hands the presenter the card it should position and the hidden node floating-ui measures the
   * arrow against. The renderer owns those nodes, so it reports them once they are in the document.
   */
  setAnchors(card: HTMLElement | null, arrowAnchor: HTMLElement | null): void;
  setOptions(patch: PresenterOptions): void;
  destroy(): void;
};

type Slot = { deps: unknown[] | null; cleanup: (() => void) | null };

function slot(): Slot {
  return { deps: null, cleanup: null };
}

function sameDeps(previous: unknown[] | null, next: unknown[]): boolean {
  if (!previous || previous.length !== next.length) return false;
  return next.every((value, index) => Object.is(value, previous[index]));
}

function samePlacement(a: CardPlacement, b: CardPlacement): boolean {
  if (a.left !== b.left || a.top !== b.top || a.side !== b.side) return false;
  if (a.arrow === b.arrow) return true;
  if (!a.arrow || !b.arrow) return false;
  return a.arrow.left === b.arrow.left && a.arrow.top === b.arrow.top;
}

function sameState(a: PresenterState, b: PresenterState): boolean {
  return (
    a.status === b.status &&
    a.step === b.step &&
    a.stepIndex === b.stepIndex &&
    a.total === b.total &&
    a.theme === b.theme &&
    a.dismissible === b.dismissible &&
    a.element === b.element &&
    a.rect === b.rect &&
    a.clipPath === b.clipPath &&
    a.reduceMotion === b.reduceMotion &&
    a.animating === b.animating &&
    samePlacement(a.placement, b.placement)
  );
}

/** Runs `job` once the renderer has had a frame to paint. Returns its canceller. */
function afterPaint(job: () => void): () => void {
  if (typeof requestAnimationFrame === "function") {
    const frame = requestAnimationFrame(job);
    return () => cancelAnimationFrame(frame);
  }
  const timer = setTimeout(job, 0);
  return () => clearTimeout(timer);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The headless half of the web player: it resolves a step's target, keeps it in view, measures it,
 * asks floating-ui where the card goes, and emits the cutout. It paints nothing, so a React host
 * and a plain-DOM host can render the same stream.
 */
export function createPresenter(
  engine: TourEngine<unknown>,
  options: PresenterOptions = {},
): Presenter {
  const registry = options.registry ?? new Map<string, Element>();
  let scrollHandler = options.scrollHandler;

  let snapshot: EngineSnapshot<unknown> = engine.getSnapshot();
  let viewport = { width: 0, height: 0 };
  let reduceMotion = prefersReducedMotion();
  let element: Element | null = null;
  let positioned: CardPlacement = CENTERED;
  let animating = false;
  let card: HTMLElement | null = null;
  let arrowAnchor: HTMLElement | null = null;
  let destroyed = false;

  const listeners = new Set<(state: PresenterState) => void>();
  const warned = new Set<string>();
  let lastTarget: string | null = null;
  let placedOnce = false;

  const slots = {
    reset: slot(),
    resolve: slot(),
    scroll: slot(),
    position: slot(),
    refresh: slot(),
    morph: slot(),
    focus: slot(),
    keys: slot(),
  };

  /** A useEffect in miniature: re-runs when `deps` change, and a returned function is its cleanup. */
  function runEffect(current: Slot, deps: unknown[], run: () => unknown): void {
    if (sameDeps(current.deps, deps)) return;
    current.cleanup?.();
    current.deps = deps;
    const cleanup = run();
    current.cleanup = typeof cleanup === "function" ? (cleanup as () => void) : null;
  }

  function computeClipPath(): string {
    const vw = viewport.width;
    const vh = viewport.height;
    if (vw === 0 || vh === 0) return "none";

    const step = snapshot.step;
    const target = step?.target ?? null;
    const rect = target ? (snapshot.rects[target] ?? null) : null;
    if (!rect) return holeClipPath(vw, vh, vw / 2, vh / 2, 0, 0, 0);

    const theme = snapshot.theme;
    const padding = step?.padding ?? theme.spotlight.padding;
    // A Corners object survives: flattening it to a number would drop the per-corner values.
    // "auto" has no element radius to read on web, so it resolves to 8, as documented.
    const configured = step?.radius ?? theme.spotlight.radius;
    const base: Radius = configured === "auto" || configured === undefined ? 8 : configured;

    const pad = (box: Rect): Hole => ({
      x: box.x - padding,
      y: box.y - padding,
      width: box.width + padding * 2,
      height: box.height + padding * 2,
      radius: padRadius(base, padding),
    });

    const extras = (step?.extraTargets ?? [])
      .map((id) => resolveTarget(id, registry)?.getBoundingClientRect())
      .filter((box): box is DOMRect => box !== undefined && box !== null);

    return holesClipPath(vw, vh, [rect, ...extras].map(pad));
  }

  function build(): PresenterState {
    const target = snapshot.step?.target ?? null;
    return {
      status: snapshot.status,
      step: snapshot.step,
      stepIndex: snapshot.stepIndex,
      total: snapshot.total,
      theme: snapshot.theme,
      dismissible: snapshot.dismissible,
      element,
      rect: target ? (snapshot.rects[target] ?? null) : null,
      placement: target ? positioned : CENTERED,
      clipPath: computeClipPath(),
      reduceMotion,
      animating,
    };
  }

  let state: PresenterState = build();

  async function reposition(): Promise<void> {
    if (destroyed) return;
    const step = snapshot.step;
    const target = step?.target ?? null;
    if (!element || !step || !target) return;

    const box = element.getBoundingClientRect();
    engine.setRect(target, { x: box.x, y: box.y, width: box.width, height: box.height });

    if (!card) return;
    const theme = snapshot.theme;

    const middleware = [offset(theme.card.offset), flip(), shift({ padding: 16 })];
    if (arrowAnchor) middleware.push(arrow({ element: arrowAnchor, padding: theme.arrow.padding }));

    const result = await computePosition(element, card, {
      strategy: "fixed",
      placement: toFloatingPlacement(step.placement ?? "auto", step.align ?? "center"),
      middleware,
    });
    if (destroyed) return;

    const data = result.middlewareData.arrow;
    const next: CardPlacement = {
      left: Math.round(result.x),
      top: Math.round(result.y),
      side: result.placement.split("-")[0] as CardPlacement["side"],
      arrow: data ? { left: Math.round(data.x ?? 0), top: Math.round(data.y ?? 0) } : null,
    };
    if (samePlacement(positioned, next)) return;
    positioned = next;
    flush();
  }

  function findTarget(): Element | null {
    const step = snapshot.step;
    const target = step?.target ?? null;
    if (!target) return null;

    const { element: found, healed } = resolveWithFingerprint(target, registry, step?.fingerprint);
    if (!found) return null;

    const key = `${snapshot.tourId}:${step?.id}`;
    if (healed && !warned.has(key)) {
      warned.add(key);
      console.warn(
        `tourkit: step "${step?.id}" could not find "${target}" and matched it by fingerprint instead. Update the target before it stops matching.`,
      );
    }
    if (element !== found) element = found;
    return found;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      if (snapshot.dismissible) void engine.stop();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      void engine.advance();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      void engine.back();
      return;
    }
    if (event.key === "Tab" && card) {
      const destination = nextFocusTarget(card, document.activeElement, event.shiftKey);
      if (destination) {
        event.preventDefault();
        destination.focus({ preventScroll: true });
      }
    }
  }

  function runEffects(): void {
    const running = snapshot.status !== "idle";
    const active = snapshot.status === "active";
    const step = snapshot.step;
    const target = step?.target ?? null;
    const theme = snapshot.theme;

    runEffect(slots.reset, [running], () => {
      if (running) return;
      placedOnce = false;
      lastTarget = null;
      warned.clear();
      animating = false;
    });

    runEffect(slots.resolve, [running, target, step, snapshot.tourId], () => {
      if (!running || !target) {
        element = null;
        return;
      }
      if (findTarget()) return;
      const observer = new MutationObserver(() => {
        if (findTarget()) {
          observer.disconnect();
          flush();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      return () => observer.disconnect();
    });

    runEffect(slots.scroll, [element, step, reduceMotion, scrollHandler], () => {
      if (!element || !step) return;
      const { enabled, block, behavior } = scrollSettings(step.scroll);
      if (!enabled) return;
      const resolved = reduceMotion ? ("auto" as const) : behavior;
      if (scrollHandler) {
        scrollHandler(element, { block, behavior: resolved }, step);
        return;
      }
      scrollIntoViewIfNeeded(element, block, resolved);
    });

    runEffect(
      slots.position,
      [element, card, arrowAnchor, step, theme.card.offset, theme.arrow.padding],
      () => {
        if (!element || !card) return;
        void reposition();
        return autoUpdate(element, card, () => void reposition());
      },
    );

    // Reading refreshToken is the point: engine.refresh() bumps it to force a remeasure without
    // waiting for the next scroll or resize that autoUpdate would catch.
    runEffect(slots.refresh, [snapshot.refreshToken, element], () => {
      if (!element) return;
      void reposition();
    });

    runEffect(slots.morph, [active, target, reduceMotion, theme.motion.morph], () => {
      if (!active) return;
      if (lastTarget === target) return;
      const wasPlaced = placedOnce;
      lastTarget = target;
      placedOnce = true;
      if (!wasPlaced || reduceMotion) return;
      animating = true;
      const timer = setTimeout(() => {
        animating = false;
        flush();
      }, theme.motion.morph);
      return () => clearTimeout(timer);
    });

    runEffect(slots.focus, [active, step?.id, card], () => {
      if (!active || !step?.id || !card) return;
      // The renderer has not painted this state yet, and a browser refuses focus inside a
      // visibility:hidden subtree. One frame is enough for the paint that reveals the card.
      const target = card;
      return afterPaint(() => {
        const focusable = target.querySelector<HTMLElement>(
          "button, [href], input, [tabindex='0']",
        );
        (focusable ?? target).focus({ preventScroll: true });
      });
    });

    runEffect(slots.keys, [active], () => {
      if (!active) return;
      document.addEventListener("keydown", onKeyDown, true);
      return () => document.removeEventListener("keydown", onKeyDown, true);
    });
  }

  let attached = false;
  let flushing = false;
  let again = false;

  function flush(): void {
    if (destroyed || !attached) return;
    if (flushing) {
      again = true;
      return;
    }
    flushing = true;
    try {
      let passes = 0;
      do {
        again = false;
        passes += 1;
        runEffects();
        const next = build();
        if (!sameState(state, next)) {
          state = next;
          for (const listener of [...listeners]) listener(state);
        }
      } while (again && passes < MAX_FLUSH_PASSES);
    } finally {
      flushing = false;
    }
  }

  const measureViewport = () => {
    viewport = { width: window.innerWidth, height: window.innerHeight };
    flush();
  };

  const onMotionChange = (event: MediaQueryListEvent) => {
    reduceMotion = event.matches;
    flush();
  };

  let motionQuery: MediaQueryList | null = null;
  let unsubscribeEngine: (() => void) | null = null;

  if (typeof window !== "undefined") {
    viewport = { width: window.innerWidth, height: window.innerHeight };
  }

  /**
   * Listeners go up on the first subscriber and come down with the last one, so a React host that
   * mounts, unmounts and remounts — as StrictMode does in development — leaves nothing behind and
   * loses nothing either.
   */
  function attach(): void {
    if (attached || destroyed) return;
    attached = true;
    if (typeof window !== "undefined") {
      viewport = { width: window.innerWidth, height: window.innerHeight };
      window.addEventListener("resize", measureViewport);
      window.visualViewport?.addEventListener("resize", measureViewport);
      if (window.matchMedia) {
        motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        motionQuery.addEventListener("change", onMotionChange);
      }
    }
    unsubscribeEngine = engine.subscribe(() => {
      snapshot = engine.getSnapshot();
      flush();
    });
    snapshot = engine.getSnapshot();
    reduceMotion = prefersReducedMotion();
    flush();
  }

  function detach(): void {
    if (!attached) return;
    attached = false;
    unsubscribeEngine?.();
    unsubscribeEngine = null;
    for (const current of Object.values(slots)) {
      current.cleanup?.();
      current.cleanup = null;
      current.deps = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", measureViewport);
      window.visualViewport?.removeEventListener("resize", measureViewport);
    }
    motionQuery?.removeEventListener("change", onMotionChange);
    motionQuery = null;
  }

  return {
    engine,
    subscribe(listener) {
      listeners.add(listener);
      attach();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) detach();
      };
    },
    getState: () => state,
    setAnchors(nextCard, nextArrow) {
      if (card === nextCard && arrowAnchor === nextArrow) return;
      card = nextCard;
      arrowAnchor = nextArrow;
      flush();
    },
    setOptions(patch) {
      if ("scrollHandler" in patch) scrollHandler = patch.scrollHandler;
      flush();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      detach();
      listeners.clear();
    },
  };
}
