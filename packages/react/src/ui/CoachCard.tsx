import { resolveButtons } from "@tourkit/core";
import type { CSSProperties } from "react";
import { useTourContext } from "../context";
import type { CardPlacement, CardProps } from "../types";

function arrowPosition(placement: CardPlacement, size: number): CSSProperties | null {
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

export function CoachCard({
  step,
  index,
  total,
  placement,
  theme,
  styled,
  classNames,
  isFirst,
  isLast,
  dismissible,
  next,
  prev,
  stop,
}: CardProps) {
  const { components } = useTourContext();
  const Progress = components.Progress;
  const position = theme.arrow.show ? arrowPosition(placement, theme.arrow.size) : null;
  const buttons = resolveButtons(step, dismissible);

  const actionStyle: CSSProperties | undefined = styled
    ? {
        ...theme.text.action,
        color: theme.accent,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }
    : undefined;

  return (
    <div
      className={["tourkit-card", classNames.card].filter(Boolean).join(" ")}
      data-tourkit="card"
      data-tourkit-placement={placement.side}
      style={
        styled
          ? {
              position: "relative",
              backgroundColor: theme.card.background,
              borderRadius: theme.card.radius,
              padding: theme.card.padding,
              boxShadow:
                theme.card.shadow === "lifted" ? "0 4px 10px rgba(17, 24, 39, 0.15)" : undefined,
            }
          : { position: "relative" }
      }
    >
      {position ? (
        <span
          className={["tourkit-arrow", classNames.arrow].filter(Boolean).join(" ")}
          data-tourkit="arrow"
          style={{
            position: "absolute",
            width: theme.arrow.size,
            height: theme.arrow.size,
            transform: "rotate(45deg)",
            ...position,
            ...(styled ? { backgroundColor: theme.card.background, borderRadius: 3 } : undefined),
          }}
        />
      ) : null}

      {buttons.close ? (
        <button
          type="button"
          className="tourkit-close"
          data-tourkit="close"
          aria-label={buttons.closeLabel}
          onClick={stop}
          style={
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
              : { position: "absolute", top: 0, right: 0 }
          }
        >
          &times;
        </button>
      ) : null}

      {step.title ? (
        <div
          className="tourkit-title"
          data-tourkit="title"
          style={styled ? theme.text.title : undefined}
        >
          {step.title}
        </div>
      ) : null}
      {step.body ? (
        <div
          className="tourkit-body"
          data-tourkit="body"
          style={styled ? { ...theme.text.body, marginTop: 4 } : undefined}
        >
          {step.body}
        </div>
      ) : null}

      <div
        className="tourkit-footer"
        data-tourkit="footer"
        style={
          styled
            ? {
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }
            : undefined
        }
      >
        <Progress index={index} total={total} theme={theme} styled={styled} />
        <div style={styled ? { display: "flex", alignItems: "center", gap: 12 } : undefined}>
          {buttons.back ? (
            <button
              type="button"
              className="tourkit-back"
              data-tourkit="back"
              onClick={prev}
              disabled={isFirst || buttons.backDisabled}
              style={
                styled
                  ? {
                      ...actionStyle,
                      color: theme.text.body.color,
                      opacity: isFirst || buttons.backDisabled ? 0.4 : 1,
                    }
                  : undefined
              }
            >
              {buttons.backLabel}
            </button>
          ) : null}
          {buttons.next ? (
            <button
              type="button"
              className="tourkit-next"
              data-tourkit="next"
              onClick={next}
              disabled={buttons.nextDisabled}
              style={
                buttons.nextDisabled && actionStyle ? { ...actionStyle, opacity: 0.4 } : actionStyle
              }
            >
              {buttons.advanceLabel(isLast)}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
