import { contrastRatio } from "./contrast";

export type FontWeight =
  | "normal"
  | "bold"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

export type TextStyle = { fontSize: number; fontWeight: FontWeight; color: string };

export type ProgressStyle = "dots" | "segmented" | "numbers" | "continuous";

export type TextContrast = "manual" | "auto";

export type Theme = {
  accent: string;
  zIndex: number;
  scrim: { color: string; opacity: number };
  spotlight: { padding: number; radius: number | "auto" };
  card: {
    background: string;
    radius: number;
    padding: number;
    maxWidth: number;
    shadow: "none" | "lifted";
  };
  text: { title: TextStyle; body: TextStyle; action: TextStyle; contrast: TextContrast };
  arrow: { size: number; show: boolean };
  motion: { morph: number; travel: number; fade: number; easing: string };
  progress: { style: ProgressStyle; activeColor: string | null; restColor: string | null };
  ring: { show: boolean; color: string | null; width: number; period: number };
  blur: { enabled: boolean; radius: number };
};

export type ThemeOverride = {
  accent?: string;
  zIndex?: number;
  scrim?: Partial<Theme["scrim"]>;
  spotlight?: Partial<Theme["spotlight"]>;
  card?: Partial<Theme["card"]>;
  text?: {
    title?: Partial<TextStyle>;
    body?: Partial<TextStyle>;
    action?: Partial<TextStyle>;
    contrast?: TextContrast;
  };
  arrow?: Partial<Theme["arrow"]>;
  motion?: Partial<Theme["motion"]>;
  progress?: Partial<Theme["progress"]>;
  ring?: Partial<Theme["ring"]>;
  blur?: Partial<Theme["blur"]>;
};

export const defaultTheme: Theme = {
  accent: "#1E9CFE",
  zIndex: 10000,
  scrim: { color: "#0B121E", opacity: 0.86 },
  spotlight: { padding: 4, radius: "auto" },
  card: {
    background: "#FBFCFE",
    radius: 16,
    padding: 16,
    maxWidth: 320,
    shadow: "lifted",
  },
  text: {
    title: { fontSize: 15, fontWeight: "700", color: "#111827" },
    body: { fontSize: 13, fontWeight: "500", color: "#6B7280" },
    action: { fontSize: 13, fontWeight: "700", color: "#1E9CFE" },
    contrast: "manual",
  },
  arrow: { size: 14, show: true },
  motion: { morph: 280, travel: 200, fade: 180, easing: "easeOutQuint" },
  progress: { style: "dots", activeColor: null, restColor: null },
  ring: { show: false, color: null, width: 2, period: 1400 },
  blur: { enabled: false, radius: 7 },
};

function apply(base: Theme, override: ThemeOverride | undefined): Theme {
  if (!override) return base;
  return {
    accent: override.accent ?? base.accent,
    zIndex: override.zIndex ?? base.zIndex,
    scrim: { ...base.scrim, ...override.scrim },
    spotlight: { ...base.spotlight, ...override.spotlight },
    card: { ...base.card, ...override.card },
    text: {
      title: { ...base.text.title, ...override.text?.title },
      body: { ...base.text.body, ...override.text?.body },
      action: { ...base.text.action, ...override.text?.action },
      contrast: override.text?.contrast ?? base.text.contrast,
    },
    arrow: { ...base.arrow, ...override.arrow },
    motion: { ...base.motion, ...override.motion },
    progress: { ...base.progress, ...override.progress },
    ring: { ...base.ring, ...override.ring },
    blur: { ...base.blur, ...override.blur },
  };
}

const ON_DARK = { title: "#F9FAFB", body: "#CBD5E1" };
const ON_LIGHT = { title: "#111827", body: "#6B7280" };

function withContrast(theme: Theme): Theme {
  if (theme.text.contrast !== "auto") return theme;
  const background = theme.card.background;
  const onDark = contrastRatio(ON_DARK.title, background) ?? 0;
  const onLight = contrastRatio(ON_LIGHT.title, background) ?? 0;
  const pair = onDark > onLight ? ON_DARK : ON_LIGHT;
  const ratio = contrastRatio(theme.accent, theme.card.background);
  const action = ratio !== null && ratio >= 3 ? theme.accent : pair.title;
  return {
    ...theme,
    text: {
      ...theme.text,
      title: { ...theme.text.title, color: pair.title },
      body: { ...theme.text.body, color: pair.body },
      action: { ...theme.text.action, color: action },
    },
  };
}

export function mergeTheme(...overrides: (ThemeOverride | undefined)[]): Theme {
  return withContrast(overrides.reduce<Theme>(apply, defaultTheme));
}
