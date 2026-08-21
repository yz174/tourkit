import { beforeEach, describe, expect, test } from "vitest";
import { resolveTarget, scrollSettings, toFloatingPlacement } from "./resolve";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("resolveTarget", () => {
  test("prefers a registered element", () => {
    const registered = document.createElement("div");
    document.body.appendChild(registered);
    const registry = new Map<string, Element>([["cta", registered]]);

    expect(resolveTarget("cta", registry)).toBe(registered);
  });

  test("ignores a registered element that left the document", () => {
    const detached = document.createElement("div");
    const registry = new Map<string, Element>([["cta", detached]]);
    document.body.innerHTML = '<button data-tour-id="cta"></button>';

    expect(resolveTarget("cta", registry)).toBe(document.querySelector("[data-tour-id]"));
  });

  test("falls back to a data-tour-id attribute", () => {
    document.body.innerHTML = '<button data-tour-id="cta">go</button>';

    expect(resolveTarget("cta", new Map())?.textContent).toBe("go");
  });

  test("falls back to a css selector", () => {
    document.body.innerHTML = '<div class="panel"><span id="deep">x</span></div>';

    expect(resolveTarget("#deep", new Map())?.id).toBe("deep");
    expect(resolveTarget(".panel", new Map())?.className).toBe("panel");
  });

  test("returns null rather than throwing on an invalid selector", () => {
    expect(resolveTarget("!!!not a selector", new Map())).toBe(null);
  });

  test("returns null when nothing matches", () => {
    expect(resolveTarget("#absent", new Map())).toBe(null);
  });
});

describe("toFloatingPlacement", () => {
  test("passes the four explicit sides through", () => {
    expect(toFloatingPlacement("top")).toBe("top");
    expect(toFloatingPlacement("left")).toBe("left");
    expect(toFloatingPlacement("right")).toBe("right");
    expect(toFloatingPlacement("bottom")).toBe("bottom");
  });

  test("auto starts at the bottom and lets flip decide", () => {
    expect(toFloatingPlacement("auto")).toBe("bottom");
  });
});

describe("scrollSettings", () => {
  test("undefined and true both mean centred and smooth", () => {
    expect(scrollSettings(undefined)).toEqual({
      enabled: true,
      block: "center",
      behavior: "smooth",
    });
    expect(scrollSettings(true)).toEqual({ enabled: true, block: "center", behavior: "smooth" });
  });

  test("false disables scrolling", () => {
    expect(scrollSettings(false).enabled).toBe(false);
  });

  test("an options object selects block and behavior", () => {
    expect(scrollSettings({ block: "start", behavior: "auto" })).toEqual({
      enabled: true,
      block: "start",
      behavior: "auto",
    });
  });

  test("a partial options object keeps the defaults for the rest", () => {
    expect(scrollSettings({ block: "end" })).toEqual({
      enabled: true,
      block: "end",
      behavior: "smooth",
    });
  });
});
