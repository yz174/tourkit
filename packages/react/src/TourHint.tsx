import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { Align } from "@tourkit/core";
import { mergeTheme, type Placement, type ThemeOverride } from "@tourkit/core";
import { resolveTarget, toFloatingPlacement } from "@tourkit/core/dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTourContext } from "./context";

const STYLE_ID = "tourkit-hint-keyframes";
const KEYFRAMES = `@keyframes tourkit-hint-pulse {
  0% { opacity: 0.7; transform: scale(0.7); }
  100% { opacity: 0; transform: scale(1.6); }
}`;

export function hintKey(id: string): string {
  return `tourkit:hint:${id}`;
}

export type TourHintProps = {
  id: string;
  target: string;
  title?: string;
  body?: string;
  placement?: Placement;
  align?: Align;
  dismissLabel?: string;
  theme?: ThemeOverride;
  className?: string;
};

export function TourHint({
  id,
  target,
  title,
  body,
  placement = "bottom",
  align = "center",
  dismissLabel = "Got it",
  theme: themeOverride,
  className,
}: TourHintProps) {
  const { registry, container, styled, storage, openHint, setOpenHint } = useTourContext();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [dotAt, setDotAt] = useState<{ left: number; top: number } | null>(null);
  const [cardAt, setCardAt] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dotEl, setDotEl] = useState<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const theme = mergeTheme(themeOverride);
  const open = openHint === id;

  useEffect(() => {
    setMounted(true);
    if (document.getElementById(STYLE_ID)) return;
    const element = document.createElement("style");
    element.id = STYLE_ID;
    element.textContent = KEYFRAMES;
    document.head.appendChild(element);
  }, []);

  useEffect(() => {
    let cancelled = false;
    storage
      .get(hintKey(id))
      .then((value) => {
        if (!cancelled) setDismissed(value === "dismissed");
      })
      .catch(() => {
        if (!cancelled) setDismissed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storage, id]);

  const place = useCallback(() => {
    const element = resolveTarget(target, registry);
    if (!element) {
      setDotAt(null);
      return;
    }
    const box = element.getBoundingClientRect();
    setDotAt({ left: box.right - 8, top: box.top - 8 });

    const card = cardRef.current;
    if (!card) return;
    void computePosition(element, card, {
      strategy: "fixed",
      placement: toFloatingPlacement(placement, align),
      middleware: [offset(12), flip(), shift({ padding: 12 })],
    }).then((result) => {
      setCardAt({ left: Math.round(result.x), top: Math.round(result.y) });
    });
  }, [target, registry, placement, align]);

  useEffect(() => {
    if (dismissed !== false) return;
    const element = resolveTarget(target, registry);
    if (!element) return;
    place();
    if (!dotEl) return;
    return autoUpdate(element, dotEl, place);
  }, [dismissed, target, registry, place, dotEl]);

  if (!mounted || dismissed !== false || !dotAt) return null;

  const dismiss = () => {
    setOpenHint(null);
    setDismissed(true);
    void storage.set(hintKey(id), "dismissed");
  };

  const tree = (
    <div className="tourkit-hint" data-tourkit="hint" data-tourkit-hint-id={id}>
      <button
        type="button"
        ref={setDotEl}
        className={["tourkit-hint-dot", className].filter(Boolean).join(" ")}
        data-tourkit="hint-dot"
        aria-label={title ? `Hint: ${title}` : "Hint"}
        aria-expanded={open}
        onClick={() => setOpenHint(open ? null : id)}
        style={
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
            : { position: "fixed", left: dotAt.left, top: dotAt.top }
        }
      >
        <span
          data-tourkit="hint-pulse"
          aria-hidden="true"
          style={
            styled
              ? {
                  position: "absolute",
                  inset: -6,
                  borderRadius: "50%",
                  border: `2px solid ${theme.accent}`,
                  animation: "tourkit-hint-pulse 1600ms ease-out infinite",
                  pointerEvents: "none",
                }
              : undefined
          }
        />
      </button>
      {open ? (
        <div
          ref={cardRef}
          className="tourkit-hint-card"
          data-tourkit="hint-card"
          role="dialog"
          aria-label={title ?? "Hint"}
          style={
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
                }
          }
        >
          {title ? (
            <div
              className="tourkit-hint-title"
              data-tourkit="hint-title"
              style={styled ? theme.text.title : undefined}
            >
              {title}
            </div>
          ) : null}
          {body ? (
            <div
              className="tourkit-hint-body"
              data-tourkit="hint-body"
              style={styled ? { ...theme.text.body, marginTop: 4 } : undefined}
            >
              {body}
            </div>
          ) : null}
          <button
            type="button"
            className="tourkit-hint-dismiss"
            data-tourkit="hint-dismiss"
            onClick={dismiss}
            style={
              styled
                ? {
                    marginTop: 10,
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                    ...theme.text.action,
                  }
                : undefined
            }
          >
            {dismissLabel}
          </button>
        </div>
      ) : null}
    </div>
  );

  return createPortal(tree, container ?? document.body);
}
