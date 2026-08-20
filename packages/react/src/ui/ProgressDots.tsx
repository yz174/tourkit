import { useMemo } from "react";
import type { ProgressProps } from "../types";

export function ProgressDots({ index, total, theme, styled }: ProgressProps) {
  const dots = useMemo(
    () => Array.from({ length: total }, (_, position) => ({ id: `dot-${position}`, position })),
    [total],
  );

  if (total <= 1) return null;

  return (
    <div
      data-tourkit="progress"
      aria-hidden="true"
      style={styled ? { display: "flex", alignItems: "center", gap: 5 } : undefined}
    >
      {dots.map((dot) => (
        <span
          key={dot.id}
          data-tourkit="progress-dot"
          data-tourkit-done={dot.position <= index ? "true" : "false"}
          style={
            styled
              ? {
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: dot.position <= index ? theme.accent : theme.text.body.color,
                  opacity: dot.position <= index ? 1 : 0.3,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
