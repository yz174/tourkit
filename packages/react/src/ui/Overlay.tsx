import type { BackdropProps } from "../types";

export function Overlay({ clipPath, transition, theme, styled, className }: BackdropProps) {
  return (
    <div
      className={["tourkit-overlay", className].filter(Boolean).join(" ")}
      data-tourkit="backdrop"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        clipPath,
        transition,
        ...(styled
          ? { backgroundColor: theme.scrim.color, opacity: theme.scrim.opacity }
          : undefined),
        ...(theme.blur.enabled
          ? {
              backdropFilter: `blur(${theme.blur.radius}px)`,
              WebkitBackdropFilter: `blur(${theme.blur.radius}px)`,
            }
          : undefined),
      }}
    />
  );
}
