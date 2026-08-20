export type TextStyle = { fontSize: number; fontWeight: string; color: string };

export type Theme = {
  accent: string;
  scrim: { color: string; opacity: number };
  spotlight: { padding: number; radius: number | "auto" };
  card: {
    background: string;
    radius: number;
    padding: number;
    maxWidth: number;
    shadow: "none" | "lifted";
  };
  text: { title: TextStyle; body: TextStyle; action: TextStyle };
  arrow: { size: number; show: boolean };
  motion: { morph: number; travel: number; fade: number; easing: string };
};

export type ThemeOverride = {
  accent?: string;
  scrim?: Partial<Theme["scrim"]>;
  spotlight?: Partial<Theme["spotlight"]>;
  card?: Partial<Theme["card"]>;
  text?: {
    title?: Partial<TextStyle>;
    body?: Partial<TextStyle>;
    action?: Partial<TextStyle>;
  };
  arrow?: Partial<Theme["arrow"]>;
  motion?: Partial<Theme["motion"]>;
};

export const defaultTheme: Theme = {
  accent: "#1E9CFE",
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
  },
  arrow: { size: 14, show: true },
  motion: { morph: 280, travel: 200, fade: 180, easing: "easeOutQuint" },
};

function apply(base: Theme, override: ThemeOverride | undefined): Theme {
  if (!override) return base;
  return {
    accent: override.accent ?? base.accent,
    scrim: { ...base.scrim, ...override.scrim },
    spotlight: { ...base.spotlight, ...override.spotlight },
    card: { ...base.card, ...override.card },
    text: {
      title: { ...base.text.title, ...override.text?.title },
      body: { ...base.text.body, ...override.text?.body },
      action: { ...base.text.action, ...override.text?.action },
    },
    arrow: { ...base.arrow, ...override.arrow },
    motion: { ...base.motion, ...override.motion },
  };
}

export function mergeTheme(...overrides: (ThemeOverride | undefined)[]): Theme {
  return overrides.reduce<Theme>(apply, defaultTheme);
}
