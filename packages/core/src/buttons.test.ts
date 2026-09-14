import { describe, expect, test } from "bun:test";
import { resolveButtons } from "./buttons";
import type { TourStep } from "./types";

const step = (buttons?: TourStep["buttons"]): TourStep =>
  buttons ? { id: "a", buttons } : { id: "a" };

describe("defaults", () => {
  test("a step with no buttons config shows next only", () => {
    const resolved = resolveButtons(step());

    expect(resolved.next).toBe(true);
    expect(resolved.back).toBe(false);
    expect(resolved.close).toBe(false);
  });

  test("the default labels are Next, Back, Done", () => {
    const resolved = resolveButtons(step());

    expect(resolved.nextLabel).toBe("Next");
    expect(resolved.backLabel).toBe("Back");
    expect(resolved.doneLabel).toBe("Done");
  });

  test("the close button has an accessible name by default", () => {
    expect(resolveButtons(step()).closeLabel).toBe("Close tour");
  });
});

describe("visibility", () => {
  test("back can be turned on", () => {
    expect(resolveButtons(step({ back: true })).back).toBe(true);
  });

  test("close can be turned on", () => {
    expect(resolveButtons(step({ close: true })).close).toBe(true);
  });

  test("next can be turned off", () => {
    expect(resolveButtons(step({ next: false })).next).toBe(false);
  });

  test("turning back on leaves next alone", () => {
    expect(resolveButtons(step({ back: true })).next).toBe(true);
  });
});

describe("labels", () => {
  test("each label can be replaced", () => {
    const resolved = resolveButtons(
      step({
        nextLabel: "Continue",
        backLabel: "Previous",
        doneLabel: "Finish",
        closeLabel: "Dismiss the tour",
      }),
    );

    expect(resolved.nextLabel).toBe("Continue");
    expect(resolved.backLabel).toBe("Previous");
    expect(resolved.doneLabel).toBe("Finish");
    expect(resolved.closeLabel).toBe("Dismiss the tour");
  });

  test("replacing one label leaves the others at their defaults", () => {
    const resolved = resolveButtons(step({ nextLabel: "Continue" }));

    expect(resolved.backLabel).toBe("Back");
    expect(resolved.doneLabel).toBe("Done");
  });

  test("an empty label falls back to the default rather than rendering blank", () => {
    expect(resolveButtons(step({ nextLabel: "" })).nextLabel).toBe("Next");
  });
});

describe("the label the advance control should carry", () => {
  test("a middle step advances with the next label", () => {
    expect(resolveButtons(step()).advanceLabel(false)).toBe("Next");
  });

  test("the last step advances with the done label", () => {
    expect(resolveButtons(step()).advanceLabel(true)).toBe("Done");
  });

  test("custom labels flow through", () => {
    const resolved = resolveButtons(step({ nextLabel: "Continue", doneLabel: "Finish" }));

    expect(resolved.advanceLabel(false)).toBe("Continue");
    expect(resolved.advanceLabel(true)).toBe("Finish");
  });
});

describe("dismissible", () => {
  test("a step that is not dismissible hides the close button even when asked for", () => {
    expect(resolveButtons(step({ close: true }), false).close).toBe(false);
  });

  test("a dismissible step keeps the close button", () => {
    expect(resolveButtons(step({ close: true }), true).close).toBe(true);
  });
});

describe("disabling without hiding", () => {
  test("next is enabled by default", () => {
    expect(resolveButtons(step()).nextDisabled).toBe(false);
  });

  test("back is enabled by default", () => {
    expect(resolveButtons(step()).backDisabled).toBe(false);
  });

  test("next can be disabled while staying visible", () => {
    const resolved = resolveButtons(step({ nextDisabled: true }));

    expect(resolved.next).toBe(true);
    expect(resolved.nextDisabled).toBe(true);
  });

  test("back can be disabled while staying visible", () => {
    const resolved = resolveButtons(step({ back: true, backDisabled: true }));

    expect(resolved.back).toBe(true);
    expect(resolved.backDisabled).toBe(true);
  });

  test("a hidden button that is also disabled stays hidden", () => {
    expect(resolveButtons(step({ next: false, nextDisabled: true })).next).toBe(false);
  });
});
