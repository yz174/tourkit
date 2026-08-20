import { describe, expect, test } from "bun:test";
import { TourEngine } from "./engine";
import { defaultTheme, mergeTheme } from "./theme";

describe("mergeTheme", () => {
  test("no overrides returns the defaults", () => {
    expect(mergeTheme()).toEqual(defaultTheme);
    expect(mergeTheme(undefined, undefined)).toEqual(defaultTheme);
  });

  test("a partial nested override keeps its siblings", () => {
    const theme = mergeTheme({ scrim: { opacity: 0.5 } });

    expect(theme.scrim.opacity).toBe(0.5);
    expect(theme.scrim.color).toBe(defaultTheme.scrim.color);
  });

  test("later overrides win per key", () => {
    const theme = mergeTheme(
      { accent: "#111111", card: { radius: 8, padding: 20 } },
      { card: { radius: 24 } },
    );

    expect(theme.accent).toBe("#111111");
    expect(theme.card.radius).toBe(24);
    expect(theme.card.padding).toBe(20);
  });

  test("text styles merge one level deeper", () => {
    const theme = mergeTheme({ text: { title: { fontSize: 22 } } });

    expect(theme.text.title.fontSize).toBe(22);
    expect(theme.text.title.color).toBe(defaultTheme.text.title.color);
    expect(theme.text.body).toEqual(defaultTheme.text.body);
  });
});

describe("theme precedence through the engine", () => {
  test("step beats tour beats provider beats default", async () => {
    const engine = new TourEngine({
      tours: [
        {
          id: "onboarding",
          version: 1,
          theme: { accent: "#tour", scrim: { opacity: 0.7 } },
          steps: [{ id: "a", theme: { accent: "#step" } }, { id: "b" }],
        },
      ],
      context: {},
      theme: { accent: "#provider", scrim: { color: "#provider-scrim" }, card: { radius: 2 } },
    });

    await engine.start("onboarding");
    const onStep = engine.getSnapshot().theme;

    expect(onStep.accent).toBe("#step");
    expect(onStep.scrim.opacity).toBe(0.7);
    expect(onStep.scrim.color).toBe("#provider-scrim");
    expect(onStep.card.radius).toBe(2);
    expect(onStep.card.padding).toBe(defaultTheme.card.padding);

    await engine.advance();
    const onNext = engine.getSnapshot().theme;

    expect(onNext.accent).toBe("#tour");
  });
});
