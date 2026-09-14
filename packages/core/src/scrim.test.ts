import { describe, expect, test } from "bun:test";
import { resolveScrimPress } from "./scrim";

describe("the default", () => {
  test("pressing the dim does nothing", () => {
    expect(resolveScrimPress(undefined, true)).toBe("none");
  });

  test("an explicit none stays none", () => {
    expect(resolveScrimPress("none", true)).toBe("none");
  });
});

describe("closing", () => {
  test("close is honoured on a dismissible step", () => {
    expect(resolveScrimPress("close", true)).toBe("close");
  });

  test("close is refused when the step may not be dismissed", () => {
    expect(resolveScrimPress("close", false)).toBe("none");
  });
});

describe("advancing", () => {
  test("next is honoured on a dismissible step", () => {
    expect(resolveScrimPress("next", true)).toBe("next");
  });

  test("next survives a step that may not be dismissed, because it is not an exit", () => {
    expect(resolveScrimPress("next", false)).toBe("next");
  });
});
