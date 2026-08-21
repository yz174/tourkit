import { describe, expect, test } from "bun:test";
import { contrastRatio, isDark, luminance, parseColor } from "./contrast";
import { mergeTheme } from "./theme";

describe("colour parsing", () => {
  test("reads six digit hex", () => {
    expect(parseColor("#1E9CFE")).toEqual([30, 156, 254]);
  });

  test("expands three digit hex", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
  });

  test("reads rgb and rgba", () => {
    expect(parseColor("rgb(11, 18, 30)")).toEqual([11, 18, 30]);
    expect(parseColor("rgba(11, 18, 30, 0.5)")).toEqual([11, 18, 30]);
  });

  test("returns null for anything else", () => {
    expect(parseColor("rebeccapurple")).toBeNull();
    expect(parseColor("#12")).toBeNull();
  });
});

describe("luminance", () => {
  test("white is 1 and black is 0", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("#000000")).toBeCloseTo(0, 5);
  });

  test("white on black is the maximum ratio", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 2);
  });

  test("an unparseable colour is not dark", () => {
    expect(isDark("nonsense")).toBe(false);
  });
});

describe("auto contrast", () => {
  test("manual is the default and leaves text alone", () => {
    const theme = mergeTheme({ card: { background: "#101828" } });
    expect(theme.text.title.color).toBe("#111827");
  });

  test("auto lightens text on a dark card", () => {
    const theme = mergeTheme({ card: { background: "#101828" }, text: { contrast: "auto" } });
    expect(theme.text.title.color).toBe("#F9FAFB");
    expect(theme.text.body.color).toBe("#CBD5E1");
  });

  test("auto darkens text on a light card", () => {
    const theme = mergeTheme({ card: { background: "#FBFCFE" }, text: { contrast: "auto" } });
    expect(theme.text.title.color).toBe("#111827");
  });

  test("the action keeps the accent when it contrasts", () => {
    const theme = mergeTheme({ card: { background: "#101828" }, text: { contrast: "auto" } });
    expect(theme.text.action.color).toBe(theme.accent);
  });

  test("the action falls back when the accent is the card colour", () => {
    const theme = mergeTheme({
      accent: "#1E9CFE",
      card: { background: "#1E9CFE" },
      text: { contrast: "auto" },
    });
    expect(theme.text.action.color).toBe("#111827");
  });

  test("a mid tone card takes whichever text reads better, not whichever is darker", () => {
    const theme = mergeTheme({ card: { background: "#1E9CFE" }, text: { contrast: "auto" } });
    expect(theme.text.title.color).toBe("#111827");
  });
});

describe("new tokens", () => {
  test("default to the quiet option", () => {
    const theme = mergeTheme();
    expect(theme.progress.style).toBe("dots");
    expect(theme.ring.show).toBe(false);
    expect(theme.blur.enabled).toBe(false);
  });

  test("merge key by key", () => {
    const theme = mergeTheme({ ring: { show: true } }, { ring: { period: 900 } });
    expect(theme.ring.show).toBe(true);
    expect(theme.ring.period).toBe(900);
    expect(theme.ring.width).toBe(2);
  });
});
