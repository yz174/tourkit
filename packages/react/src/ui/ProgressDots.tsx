import { formatProgress } from "@tourkit/core";
import { useMemo } from "react";
import type { ProgressProps } from "../types";

const TRACK_WIDTH = 96;

export function ProgressDots({ index, total, theme, styled }: ProgressProps) {
  const steps = useMemo(
    () => Array.from({ length: total }, (_, position) => ({ id: `step-${position}`, position })),
    [total],
  );

  if (total <= 1) return null;

  const active = theme.progress.activeColor ?? theme.accent;
  const rest = theme.progress.restColor ?? theme.text.body.color;
  const style = theme.progress.style;

  if (style === "numbers") {
    return (
      <span
        className="tourkit-progress tourkit-progress-numbers"
        data-tourkit="progress"
        aria-hidden="true"
        style={
          styled
            ? {
                color: active,
                fontSize: theme.text.body.fontSize,
                fontWeight: theme.text.body.fontWeight,
                fontVariantNumeric: "tabular-nums",
              }
            : undefined
        }
      >
        {formatProgress(theme.progress.template, index, total)}
      </span>
    );
  }

  if (style === "continuous") {
    const filled = Math.round(TRACK_WIDTH * ((index + 1) / total));
    return (
      <span
        className="tourkit-progress tourkit-progress-continuous"
        data-tourkit="progress"
        aria-hidden="true"
        style={
          styled
            ? {
                display: "inline-block",
                position: "relative",
                width: TRACK_WIDTH,
                height: 6,
                borderRadius: 3,
                overflow: "hidden",
              }
            : undefined
        }
      >
        <span
          data-tourkit="progress-track"
          style={
            styled
              ? {
                  position: "absolute",
                  inset: 0,
                  backgroundColor: rest,
                  opacity: 0.3,
                  borderRadius: 3,
                }
              : undefined
          }
        />
        <span
          data-tourkit="progress-fill"
          style={
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
              : undefined
          }
        />
      </span>
    );
  }

  return (
    <div
      className={`tourkit-progress tourkit-progress-${style}`}
      data-tourkit="progress"
      aria-hidden="true"
      style={styled ? { display: "flex", alignItems: "center", gap: 5 } : undefined}
    >
      {steps.map((step) => {
        const done = step.position <= index;
        const isActive = style === "segmented" && step.position === index;
        return (
          <span
            key={step.id}
            className="tourkit-progress-step"
            data-tourkit="progress-dot"
            data-tourkit-done={done ? "true" : "false"}
            data-tourkit-active={isActive ? "true" : "false"}
            style={
              styled
                ? {
                    width: isActive ? 22 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: done ? active : rest,
                    opacity: done ? 1 : 0.3,
                    transition: `width ${theme.motion.travel}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
