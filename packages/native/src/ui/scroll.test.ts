import { describe, expect, test } from "bun:test";
import { scrollOffsetFor, scrollSettings } from "./scroll";

describe("scrollOffsetFor", () => {
  test("centre puts the middle of the target at the middle of the viewport", () => {
    expect(scrollOffsetFor(1000, 40, 800, "center")).toBe(620);
  });

  test("start puts the top of the target at the top of the viewport", () => {
    expect(scrollOffsetFor(1000, 40, 800, "start")).toBe(1000);
  });

  test("end puts the bottom of the target at the bottom of the viewport", () => {
    expect(scrollOffsetFor(1000, 40, 800, "end")).toBe(240);
  });

  test("never scrolls above the top of the content", () => {
    expect(scrollOffsetFor(10, 40, 800, "center")).toBe(0);
    expect(scrollOffsetFor(10, 40, 800, "end")).toBe(0);
    expect(scrollOffsetFor(-50, 40, 800, "start")).toBe(0);
  });
});

describe("scrollSettings", () => {
  test("undefined and true both mean centre", () => {
    expect(scrollSettings(undefined)).toEqual({ enabled: true, block: "center" });
    expect(scrollSettings(true)).toEqual({ enabled: true, block: "center" });
  });

  test("false disables scrolling", () => {
    expect(scrollSettings(false)).toEqual({ enabled: false, block: "center" });
  });

  test("an options object selects the block", () => {
    expect(scrollSettings({ block: "start" })).toEqual({ enabled: true, block: "start" });
    expect(scrollSettings({ behavior: "smooth" })).toEqual({ enabled: true, block: "center" });
  });
});
