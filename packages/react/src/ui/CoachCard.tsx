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
  isLast,
  next,
}: CardProps) {
  const { components } = useTourContext();
  const Progress = components.Progress;
  const position = theme.arrow.show ? arrowPosition(placement, theme.arrow.size) : null;

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
        <button
          type="button"
          className="tourkit-next"
          data-tourkit="next"
          onClick={next}
          style={
            styled
              ? {
                  ...theme.text.action,
                  color: theme.accent,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }
              : undefined
          }
        >
          {isLast ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}
