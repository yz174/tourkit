import { describe, expect, test } from "bun:test";
import { type Candidate, pickTarget } from "./hitTest";

const outer: Candidate = { id: "card", rect: { x: 0, y: 0, width: 300, height: 200 } };
const inner: Candidate = { id: "button", rect: { x: 20, y: 20, width: 100, height: 40 } };

describe("pickTarget", () => {
  test("finds the target under the point", () => {
    expect(pickTarget([outer], 10, 10)).toBe("card");
  });

  test("a tap outside every target records nothing", () => {
    expect(pickTarget([outer], 400, 10)).toBeNull();
    expect(pickTarget([], 10, 10)).toBeNull();
  });

  test("the innermost target wins when they nest", () => {
    expect(pickTarget([outer, inner], 40, 30)).toBe("button");
    expect(pickTarget([inner, outer], 40, 30)).toBe("button");
  });

  test("outside the inner box falls back to the outer one", () => {
    expect(pickTarget([outer, inner], 200, 150)).toBe("card");
  });

  test("edges count as hits", () => {
    expect(pickTarget([inner], 20, 20)).toBe("button");
    expect(pickTarget([inner], 120, 60)).toBe("button");
  });

  test("unmeasured targets are ignored", () => {
    const empty: Candidate = { id: "ghost", rect: { x: 0, y: 0, width: 0, height: 0 } };
    expect(pickTarget([empty], 0, 0)).toBeNull();
    expect(pickTarget([empty, outer], 0, 0)).toBe("card");
  });
});
