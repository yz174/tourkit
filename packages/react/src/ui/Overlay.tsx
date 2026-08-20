import type { BackdropProps } from "../types";

export function Overlay({ clipPath, transition, theme, styled }: BackdropProps) {
  return (
    <div
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
      }}
    />
  );
}
