import { describe, expect, test } from "bun:test";
import { formatProgress } from "./progress";
import { defaultTheme, mergeTheme } from "./theme";

describe("formatProgress", () => {
  test("fills in the current step and the total", () => {
    expect(formatProgress("{{current}} of {{total}}", 0, 7)).toBe("1 of 7");
  });

  test("current is one-based, because it is read by a person", () => {
    expect(formatProgress("{{current}}", 2, 7)).toBe("3");
  });

  test("a placeholder can appear more than once", () => {
    expect(formatProgress("{{current}}/{{total}} ({{current}})", 1, 4)).toBe("2/4 (2)");
  });

  test("text with no placeholders is returned unchanged", () => {
    expect(formatProgress("Almost there", 1, 4)).toBe("Almost there");
  });

  test("an unknown placeholder is left alone", () => {
    expect(formatProgress("{{current}} of {{steps}}", 0, 3)).toBe("1 of {{steps}}");
  });

  test("whitespace inside a placeholder still matches", () => {
    expect(formatProgress("{{ current }} of {{ total }}", 0, 3)).toBe("1 of 3");
  });
});

describe("the progress template token", () => {
  test("defaults to a slash-separated counter", () => {
    expect(defaultTheme.progress.template).toBe("{{current}} / {{total}}");
  });

  test("can be overridden through the theme", () => {
    const theme = mergeTheme({ progress: { template: "Step {{current}} of {{total}}" } });

    expect(theme.progress.template).toBe("Step {{current}} of {{total}}");
  });

  test("overriding the template leaves the style alone", () => {
    const theme = mergeTheme({ progress: { template: "{{current}}" } });

    expect(theme.progress.style).toBe("dots");
  });
});

describe("the card offset token", () => {
  test("defaults to 14", () => {
    expect(defaultTheme.card.offset).toBe(14);
  });

  test("can be overridden without disturbing the rest of the card", () => {
    const theme = mergeTheme({ card: { offset: 24 } });

    expect(theme.card.offset).toBe(24);
    expect(theme.card.radius).toBe(defaultTheme.card.radius);
  });
});

describe("the arrow padding token", () => {
  test("defaults to 8", () => {
    expect(defaultTheme.arrow.padding).toBe(8);
  });

  test("can be overridden", () => {
    expect(mergeTheme({ arrow: { padding: 2 } }).arrow.padding).toBe(2);
  });
});

describe("turning the arrow off for one step", () => {
  test("a step theme can hide the arrow the tour shows", () => {
    const theme = mergeTheme({ arrow: { show: true } }, undefined, { arrow: { show: false } });

    expect(theme.arrow.show).toBe(false);
  });

  test("a step that says nothing keeps the tour's arrow setting", () => {
    const theme = mergeTheme({ arrow: { show: true } }, undefined, { card: { radius: 4 } });

    expect(theme.arrow.show).toBe(true);
  });
});
