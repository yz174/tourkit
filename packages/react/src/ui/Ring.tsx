import type { Rect, Theme } from "@tourkit/core";
import { useEffect } from "react";

const STYLE_ID = "tourkit-ring-keyframes";
const KEYFRAMES = `@keyframes tourkit-ring-breathe {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.035); }
}`;

export type RingProps = {
  hole: Rect;
  radius: number;
  theme: Theme;
};

export function Ring({ hole, radius, theme }: RingProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const element = document.createElement("style");
    element.id = STYLE_ID;
    element.textContent = KEYFRAMES;
    document.head.appendChild(element);
  }, []);

  const width = theme.ring.width;

  return (
    <div
      className="tourkit-ring"
      data-tourkit="ring"
      aria-hidden="true"
      style={{
        position: "fixed",
        left: hole.x - width,
        top: hole.y - width,
        width: hole.width + width * 2,
        height: hole.height + width * 2,
        borderRadius: radius + width,
        border: `${width}px solid ${theme.ring.color ?? theme.accent}`,
        pointerEvents: "none",
        animation: `tourkit-ring-breathe ${theme.ring.period}ms ease-in-out infinite`,
      }}
    />
  );
}
